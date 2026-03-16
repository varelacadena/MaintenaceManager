import OpenAI from "openai";
import { storage } from "./storage";
import type { ServiceRequest, Task, AiAgentLog } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── Model tiers ──────────────────────────────────────────────────────────────
// Mini: fast + cost-effective, for routine triage/simple scheduling
// Full: smarter, for complex project scheduling and conflict resolution
const MINI = "gpt-4o-mini";
const FULL = "gpt-4o";

interface AiCallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

async function callAI(prompt: string, tier: "haiku" | "sonnet" = "haiku"): Promise<AiCallResult> {
  const model = tier === "sonnet" ? FULL : MINI;
  try {
    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    return {
      content: response.choices[0]?.message?.content ?? "",
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      model,
    };
  } catch (error: any) {
    console.error(`[aiAgent] ${model} call failed:`, error.message);
    throw error;
  }
}

function parseJsonFromResponse(text: string): any {
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ─── Context builders ─────────────────────────────────────────────────────────
async function buildTeamCapacityContext(targetDate?: Date): Promise<string> {
  const date = targetDate || new Date();
  const dayOfWeek = date.getDay();
  const technicians = await storage.getUsersByRoles(["technician", "staff"]);
  const students = await storage.getUsersByRoles(["student"]);
  const allWorkers = [...technicians, ...students];

  const activeTasks = await storage.getTasks({ status: "in_progress" });
  const pendingTasks = await storage.getTasks({ status: "not_started" });

  const workerLoads = await Promise.all(
    allWorkers.map(async (worker) => {
      const workerTasks = [...activeTasks, ...pendingTasks].filter(
        (t: any) => t.assignedToId === worker.id
      );
      const totalHours = workerTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 2), 0);
      const availability = await storage.getUserAvailability(worker.id);
      const todayAvail = availability.find((a) => a.dayOfWeek === dayOfWeek && a.isAvailable);
      const skills = await storage.getUserSkills(worker.id);
      return {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName}`,
        role: worker.role,
        currentTaskCount: workerTasks.length,
        estimatedHoursLoaded: totalHours,
        availableToday: !!todayAvail,
        availableHours: todayAvail ? `${todayAvail.startTime}-${todayAvail.endTime}` : "unavailable",
        skills: skills.map((s) => `${s.skillName} (${s.proficiencyLevel})`).join(", ") || "general",
      };
    })
  );

  return JSON.stringify(workerLoads, null, 2);
}

async function buildSlaContext(): Promise<string> {
  const slaConfigs = await storage.getSlaConfigs();
  return JSON.stringify(slaConfigs, null, 2);
}

// ─── T020: Service Request Auto-Triage ───────────────────────────────────────
async function triageServiceRequest(request: ServiceRequest): Promise<AiAgentLog> {
  const [slaContext, teamContext] = await Promise.all([
    buildSlaContext(),
    buildTeamCapacityContext(),
  ]);

  const today = new Date().toISOString().split("T")[0];

  const prompt = `You are a facility management AI assistant. Analyze this service request and provide structured triage including the best person to assign it to.

SERVICE REQUEST:
Title: ${(request as any).title || (request as any).name}
Description: ${request.description || "None provided"}
Category: ${(request as any).category || "Not specified"}
Urgency: ${request.urgency}
Property: ${(request as any).propertyId || "Unknown"}
Requested Date: ${(request as any).requestedDate || "Not specified"}
Today's Date: ${today}

SLA TARGETS:
${slaContext}

TEAM CAPACITY & SKILLS (use id, name, skills, availableToday, estimatedHoursLoaded to pick the best assignee):
${teamContext}

Analyze this request and return ONLY a JSON object with this exact structure:
\`\`\`json
{
  "suggestedUrgency": "low|medium|high",
  "suggestedCategory": "electrical|plumbing|hvac|mechanical|general|cleaning|landscaping|it",
  "suggestedExecutorType": "technician|student",
  "suggestedSkill": "electrical|plumbing|hvac|mechanical|general",
  "draftTaskTitle": "brief action-oriented title",
  "estimatedHours": 2,
  "suggestedAssigneeId": "user-id from team context, or null if no good match",
  "suggestedAssigneeName": "Full Name from team context, or null",
  "suggestedStartDate": "YYYY-MM-DD suggested start date based on urgency and SLA, or null",
  "suggestedStartDateReason": "One sentence explaining the timing choice, or null",
  "reasoning": "One sentence explaining the overall triage decision"
}
\`\`\`
Pick the assignee whose skills best match the required skill, who is available today, and has the lowest current workload. If no one matches well, set suggestedAssigneeId and suggestedAssigneeName to null.`;

  const aiResult = await callAI(prompt, "haiku");
  const parsed = parseJsonFromResponse(aiResult.content);

  const log = await storage.createAiAgentLog({
    action: "triage",
    entityType: "service_request",
    entityId: request.id,
    reasoning: parsed.reasoning,
    proposedValue: parsed,
    status: "pending_review",
    promptTokens: aiResult.promptTokens,
    completionTokens: aiResult.completionTokens,
    modelUsed: aiResult.model,
  });

  await notifyAdminsOfPendingAction(log);
  return log;
}

// ─── T021: Capacity-Aware Task Scheduling ─────────────────────────────────────
async function suggestTaskSchedule(task: Task): Promise<AiAgentLog> {
  const teamContext = await buildTeamCapacityContext();
  const slaContext = await buildSlaContext();
  const deps = await storage.getTaskDependencies(task.id);

  const prompt = `You are a facility management scheduling AI. Suggest the best person and date to assign this task.

TASK:
Title: ${(task as any).name || (task as any).title}
Description: ${task.description || "None"}
Urgency: ${task.urgency}
Estimated Hours: ${(task as any).estimatedHours || "Unknown"}
Required Skill: ${(task as any).requiredSkill || "general"}
Current Assignee: ${task.assignedToId || "Unassigned"}
Dependencies: ${deps.length > 0 ? `${deps.length} task(s) must complete first` : "None"}

TEAM CAPACITY (today):
${teamContext}

SLA TARGETS:
${slaContext}

Return ONLY a JSON object:
\`\`\`json
{
  "suggestedAssigneeId": "user-id-here",
  "suggestedAssigneeName": "Name Here",
  "suggestedStartDate": "YYYY-MM-DD",
  "suggestedDueDate": "YYYY-MM-DD",
  "reasoning": "One to two sentences explaining your choices"
}
\`\`\``;

  const aiResult = await callAI(prompt, "haiku");
  const parsed = parseJsonFromResponse(aiResult.content);

  const log = await storage.createAiAgentLog({
    action: "schedule",
    entityType: "task",
    entityId: task.id,
    reasoning: parsed.reasoning,
    proposedValue: parsed,
    status: "pending_review",
    promptTokens: aiResult.promptTokens,
    completionTokens: aiResult.completionTokens,
    modelUsed: aiResult.model,
  });

  await notifyAdminsOfPendingAction(log);
  return log;
}

// ─── T022: Smart Due Date Check ───────────────────────────────────────────────
async function checkDueDateFeasibility(
  task: Partial<Task> & { estimatedHours?: number; requiredSkill?: string }
): Promise<{ feasible: boolean; warning?: string; suggestedDate?: string; historicalAvgHours?: number }> {
  if (!(task as any).dueDate) return { feasible: true };

  const teamContext = await buildTeamCapacityContext(new Date((task as any).dueDate));

  const prompt = `You are a facility scheduling AI. Assess if this task's due date is realistic.

TASK:
Title: ${(task as any).title || task.name}
Due Date: ${(task as any).dueDate}
Urgency: ${task.urgency}
Estimated Hours: ${task.estimatedHours || 2}
Required Skill: ${task.requiredSkill || "general"}

TEAM CAPACITY ON DUE DATE:
${teamContext}

Return ONLY a JSON object:
\`\`\`json
{
  "feasible": true,
  "warning": null,
  "suggestedDate": null,
  "reasoning": "brief explanation"
}
\`\`\`
If infeasible, set feasible to false, provide a warning message, and suggest a better date.`;

  try {
    const aiResult = await callAI(prompt, "haiku");
    const parsed = parseJsonFromResponse(aiResult.content);
    return {
      feasible: parsed.feasible,
      warning: parsed.warning,
      suggestedDate: parsed.suggestedDate,
    };
  } catch {
    return { feasible: true };
  }
}

// ─── T023: Project Auto-Scheduling ───────────────────────────────────────────
async function scheduleProject(projectId: string): Promise<AiAgentLog[]> {
  const tasks = await storage.getTasksByProject(projectId);
  if (tasks.length === 0) return [];

  const teamContext = await buildTeamCapacityContext();

  const taskList = tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    estimatedHours: t.estimatedHours || 2,
    requiredSkill: t.requiredSkill || "general",
    urgency: t.urgency,
    currentAssignee: t.assignedToId || "unassigned",
  }));

  const depsMap: Record<string, string[]> = {};
  for (const task of tasks) {
    const deps = await storage.getTaskDependencies(task.id);
    if (deps.length > 0) {
      depsMap[task.id] = deps.map((d) => d.dependsOnTaskId);
    }
  }

  const prompt = `You are a project scheduling AI for a facility management system. Create a full schedule for all project tasks.

PROJECT TASKS:
${JSON.stringify(taskList, null, 2)}

TASK DEPENDENCIES (taskId -> must complete these first):
${JSON.stringify(depsMap, null, 2)}

TEAM CAPACITY:
${teamContext}

Today's date: ${new Date().toISOString().split("T")[0]}

Return ONLY a JSON array of assignments:
\`\`\`json
[
  {
    "taskId": "task-id",
    "assigneeId": "user-id",
    "assigneeName": "Name",
    "startDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD",
    "reasoning": "brief reason"
  }
]
\`\`\`
Respect dependencies (dependent tasks must start after their blockers are due). Spread work based on capacity.`;

  const aiResult = await callAI(prompt, "sonnet");
  const parsed = parseJsonFromResponse(aiResult.content);

  if (!Array.isArray(parsed)) return [];

  const logs: AiAgentLog[] = [];
  const perTaskPromptTokens = Math.round(aiResult.promptTokens / Math.max(parsed.length, 1));
  const perTaskCompletionTokens = Math.round(aiResult.completionTokens / Math.max(parsed.length, 1));
  for (const assignment of parsed) {
    const log = await storage.createAiAgentLog({
      action: "schedule",
      entityType: "task",
      entityId: assignment.taskId,
      reasoning: assignment.reasoning,
      proposedValue: assignment,
      status: "pending_review",
      promptTokens: perTaskPromptTokens,
      completionTokens: perTaskCompletionTokens,
      modelUsed: aiResult.model,
    });
    logs.push(log);
    await notifyAdminsOfPendingAction(log);
  }

  return logs;
}

// ─── T024: Fleet PM Automation ────────────────────────────────────────────────
async function checkVehicleCheckIn(checkInData: {
  vehicleId: string;
  currentMileage: number;
  damageReported: boolean;
  damageDescription?: string;
  reportedById: string;
}): Promise<void> {
  const vehicle = await storage.getVehicle(checkInData.vehicleId);
  if (!vehicle) return;

  const schedules = await storage.getVehicleMaintenanceSchedules(checkInData.vehicleId);
  const admins = await storage.getUsersByRoles(["admin"]);
  const adminId = admins[0]?.id;
  if (!adminId) return;

  for (const schedule of schedules) {
    const threshold = (schedule as any).mileageInterval || 5000;
    const lastMileage = (schedule as any).lastServiceMileage || 0;
    const milesUntilDue = threshold - (checkInData.currentMileage - lastMileage);

    if (milesUntilDue <= 500 && milesUntilDue > 0) {
      const task = await storage.createTask({
        name: `PM: ${schedule.maintenanceType} for ${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`,
        description: `Preventive maintenance due. Current mileage: ${checkInData.currentMileage}. Last service: ${lastMileage} miles. Threshold: ${threshold} miles.`,
        urgency: "medium",
        status: "not_started",
        taskType: "maintenance",
        assignedPool: "technician_pool",
        aiGenerated: true,
        createdById: adminId,
        vehicleId: checkInData.vehicleId,
      } as any);

      await storage.createAiAgentLog({
        action: "pm_trigger",
        entityType: "vehicle",
        entityId: checkInData.vehicleId,
        reasoning: `Vehicle ${vehicle.vehicleId} is ${milesUntilDue} miles from ${schedule.maintenanceType} threshold. Task auto-created.`,
        proposedValue: { taskId: task.id, maintenanceType: schedule.maintenanceType, milesUntilDue },
        status: "auto_applied",
      });
    }
  }

  if (checkInData.damageReported && checkInData.damageDescription) {
    const task = await storage.createTask({
      name: `Damage Repair: ${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`,
      description: `Damage reported during check-in: ${checkInData.damageDescription}`,
      urgency: "high",
      status: "not_started",
      taskType: "repair",
      assignedPool: "technician_pool",
      aiGenerated: true,
      createdById: adminId,
      vehicleId: checkInData.vehicleId,
    } as any);

    await storage.updateVehicle(checkInData.vehicleId, { status: "maintenance" } as any);

    await storage.createAiAgentLog({
      action: "fleet_maintenance",
      entityType: "vehicle",
      entityId: checkInData.vehicleId,
      reasoning: `Damage reported during check-in. Repair task created and vehicle flagged as unavailable until resolved.`,
      proposedValue: { taskId: task.id, damage: checkInData.damageDescription },
      status: "auto_applied",
    });
  }
}

// ─── T025: Equipment PM Daily Job ─────────────────────────────────────────────
async function runEquipmentPmCheck(): Promise<void> {
  const allEquipment = await storage.getEquipment() as any[];
  const admins = await storage.getUsersByRoles(["admin"]);
  const adminId = admins[0]?.id;
  if (!adminId) return;

  for (const eq of allEquipment) {
    const eqAny = eq as any;
    if (!eqAny.maintenanceIntervalDays) continue;

    const tasks = await storage.getTasks({ status: "completed" });
    const eqTasks = tasks.filter((t: any) => t.equipmentId === eq.id);
    eqTasks.sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    const lastCompleted = eqTasks[0];
    if (!lastCompleted) continue;

    const lastDate = new Date(lastCompleted.updatedAt || lastCompleted.createdAt || new Date());
    const nextDue = new Date(lastDate);
    nextDue.setDate(nextDue.getDate() + eqAny.maintenanceIntervalDays);

    const now = new Date();
    const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 14 && daysUntilDue > 0) {
      const pending = await storage.getTasks({ status: "not_started" });
      const alreadyExists = pending.some((t: any) => t.equipmentId === eq.id && t.aiGenerated);
      if (alreadyExists) continue;

      const teamContext = await buildTeamCapacityContext(nextDue);
      const skills = await storage.getAllUserSkills();
      const matchedSkill = skills.find((s) => s.skillName === (eqAny.requiredSkill || "general"));

      await storage.createTask({
        name: `PM: ${eq.name} scheduled maintenance`,
        description: `Preventive maintenance due on ${nextDue.toLocaleDateString()}. Equipment: ${eq.name} (${eq.category}).`,
        urgency: "medium",
        status: "not_started",
        taskType: "maintenance",
        estimatedCompletionDate: nextDue,
        assignedToId: matchedSkill?.userId || adminId,
        aiGenerated: true,
        createdById: adminId,
        equipmentId: eq.id,
      } as any);

      await storage.createAiAgentLog({
        action: "pm_trigger",
        entityType: "equipment",
        entityId: eq.id,
        reasoning: `Equipment "${eq.name}" PM due in ${daysUntilDue} days. Auto-generated task.`,
        proposedValue: { equipmentName: eq.name, daysUntilDue, dueDate: nextDue.toISOString() },
        status: "auto_applied",
      });
    }
  }
}

// ─── T026: Student Task Matching ──────────────────────────────────────────────
async function rankStudentsForTask(task: Task): Promise<AiAgentLog> {
  const students = await storage.getUsersByRoles(["student"]);

  const studentProfiles = await Promise.all(
    students.map(async (s) => {
      const skills = await storage.getUserSkills(s.id);
      const availability = await storage.getUserAvailability(s.id);
      const activeTasks = await storage.getTasks({ status: "in_progress" });
      const studentTasks = activeTasks.filter((t: any) => t.assignedToId === s.id);
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        skills: skills.map((sk) => sk.skillName),
        currentWorkload: studentTasks.length,
        availabilityDays: availability.filter((a) => a.isAvailable).map((a) => a.dayOfWeek),
      };
    })
  );

  const prompt = `You are a facility management AI. Rank students for this task and suggest top 3 matches.

TASK:
Title: ${(task as any).name || (task as any).title}
Required Skill: ${(task as any).requiredSkill || "general"}
Urgency: ${task.urgency}
Estimated Hours: ${(task as any).estimatedHours || 1}

STUDENT PROFILES:
${JSON.stringify(studentProfiles, null, 2)}

Return ONLY a JSON object:
\`\`\`json
{
  "recommendations": [
    {
      "studentId": "id",
      "studentName": "Name",
      "rank": 1,
      "reasoning": "why this student is a good fit"
    }
  ],
  "overallReasoning": "summary of matching approach"
}
\`\`\`
Include up to 3 recommendations, ranked best to worst.`;

  const aiResult = await callAI(prompt, "haiku");
  const parsed = parseJsonFromResponse(aiResult.content);

  const log = await storage.createAiAgentLog({
    action: "assign",
    entityType: "task",
    entityId: task.id,
    reasoning: parsed.overallReasoning,
    proposedValue: parsed,
    status: "pending_review",
    promptTokens: aiResult.promptTokens,
    completionTokens: aiResult.completionTokens,
    modelUsed: aiResult.model,
  });

  await notifyAdminsOfPendingAction(log);
  return log;
}

// ─── Notify admins about pending AI recommendations ─────────────────────────
async function notifyAdminsOfPendingAction(log: AiAgentLog): Promise<void> {
  try {
    const admins = await storage.getUsersByRoles(["admin"]);
    const already = await storage.hasNotificationForRelatedItem(log.id, "system");
    if (already) return;

    const value = log.proposedValue as any;
    let title = "New AI recommendation";
    let message = "A new AI suggestion needs your review.";

    if (log.action === "triage") {
      const reqTitle = value?.draftTaskTitle || "a service request";
      title = "AI triage suggestion";
      message = `AI triaged "${reqTitle}" as ${value?.suggestedUrgency || "unknown"} urgency${value?.suggestedAssigneeName ? `, suggested assigning to ${value.suggestedAssigneeName}` : ""}.`;
    } else if (log.action === "schedule") {
      const assignee = value?.suggestedAssigneeName || value?.assigneeName;
      let taskTitle = "";
      if (log.entityId) {
        try {
          const task = await storage.getTask(log.entityId);
          if (task) taskTitle = ` for "${task.name}"`;
        } catch {}
      }
      title = "AI scheduling suggestion";
      message = `AI suggests${taskTitle}${assignee ? ` assigning to ${assignee}` : ""}${value?.suggestedStartDate ? `, starting ${value.suggestedStartDate}` : ""}${value?.suggestedDueDate || value?.dueDate ? `, due ${value.suggestedDueDate || value.dueDate}` : ""}.`;
    } else if (log.action === "assign") {
      const topRec = value?.recommendations?.[0];
      let taskTitle = "";
      if (log.entityId) {
        try {
          const task = await storage.getTask(log.entityId);
          if (task) taskTitle = ` for "${task.name}"`;
        } catch {}
      }
      title = "AI assignment suggestion";
      message = topRec
        ? `AI recommends${taskTitle} assigning to ${topRec.studentName}${value.recommendations.length > 1 ? ` (+${value.recommendations.length - 1} alternatives)` : ""}.`
        : `AI has new assignment recommendations${taskTitle} for your review.`;
    }

    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        type: "system",
        title,
        message,
        link: "/ai-agent",
        relatedId: log.id,
        relatedType: "ai_recommendation",
      });
    }
  } catch (err) {
    console.error("[aiAgent] Failed to create admin notifications:", err);
  }
}

// ─── Apply Approved Actions ───────────────────────────────────────────────────
async function applyApprovedAction(log: AiAgentLog): Promise<void> {
  const value = log.proposedValue as any;
  if (!value) return;

  if (log.action === "schedule" && log.entityType === "task" && log.entityId) {
    const updates: any = {};
    if (value.suggestedAssigneeId) updates.assignedToId = value.suggestedAssigneeId;
    if (value.assigneeId) updates.assignedToId = value.assigneeId;
    if (value.suggestedDueDate) updates.dueDate = new Date(value.suggestedDueDate);
    if (value.dueDate) updates.dueDate = new Date(value.dueDate);
    if (Object.keys(updates).length > 0) {
      await storage.updateTask(log.entityId, updates);
    }
  }

  if (log.action === "triage" && log.entityType === "service_request" && log.entityId) {
    if (value.suggestedUrgency) {
      await storage.updateServiceRequest(log.entityId, { urgency: value.suggestedUrgency });
    }
  }

  if (log.action === "assign" && log.entityType === "task" && log.entityId) {
    const recs = value.recommendations || [];
    if (recs.length > 0) {
      await storage.updateTask(log.entityId, { assignedToId: recs[0].studentId });
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const aiAgent = {
  triageServiceRequest,
  suggestTaskSchedule,
  checkDueDateFeasibility,
  scheduleProject,
  checkVehicleCheckIn,
  runEquipmentPmCheck,
  rankStudentsForTask,
  applyApprovedAction,
};
