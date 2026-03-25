import React, { useState } from "react";
import {
  ClipboardList,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  ListChecks,
  Plus,
  X,
  Clock,
  Building2,
  Wrench,
  Car,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Settings2,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  properties,
  spaces,
  equipment,
  vehicles,
  technicians,
  students,
  vendors,
  projects,
  checklistTemplates,
} from "./_shared/data";

export function ProgressiveForm() {
  const [taskName, setTaskName] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [propertyId, setPropertyId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  
  const [assigneeType, setAssigneeType] = useState("technician");
  const [assigneeId, setAssigneeId] = useState("");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Section 1: Description
  const [description, setDescription] = useState("");

  // Section 2: Schedule
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  // Section 3: Sub-tasks
  const [subtasks, setSubtasks] = useState([{ id: 1, title: "", completed: false }]);

  // Section 4: Checklists
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [checklistGroups, setChecklistGroups] = useState<{name: string, items: string[]}[]>([]);

  // Section 5: Contact Info
  const [contactType, setContactType] = useState("none");
  const [contactId, setContactId] = useState("");

  // Section 6: Advanced
  const [taskType, setTaskType] = useState("maintenance");
  const [projectId, setProjectId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [requiresEstimate, setRequiresEstimate] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { id: Date.now(), title: "", completed: false }]);
  };

  const updateSubtask = (id: number, title: string) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, title } : st)));
  };

  const removeSubtask = (id: number) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = checklistTemplates.find(t => t.id === templateId);
    if (template) {
      setChecklistGroups([{ name: template.name, items: [...template.items] }]);
    } else {
      setChecklistGroups([]);
    }
  };

  // Calculate filled sections for the footer
  let filledSections = 0;
  if (description) filledSections++;
  if (startDate || dueDate || scheduledTime || isRecurring) filledSections++;
  if (subtasks.some((st) => st.title)) filledSections++;
  if (checklistGroups.length > 0) filledSections++;
  if (contactType !== "none") filledSections++;
  if (taskType !== "maintenance" || projectId || instructions || requiresPhoto || requiresEstimate) filledSections++;

  return (
    <div className="min-h-screen bg-background p-6 font-sans pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Create New Task</h1>
        </div>

        {/* ESSENTIAL FIELDS CARD */}
        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Task Name</Label>
              <Input
                placeholder="e.g., Fix leaking faucet in men's restroom"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="text-lg py-6"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                <div className="flex gap-2">
                  <Button
                    variant={priority === "low" ? "default" : "outline"}
                    className={priority === "low" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    onClick={() => setPriority("low")}
                    size="sm"
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${priority === "low" ? "bg-white" : "bg-emerald-500"}`} />
                    Low
                  </Button>
                  <Button
                    variant={priority === "medium" ? "default" : "outline"}
                    className={priority === "medium" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    onClick={() => setPriority("medium")}
                    size="sm"
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${priority === "medium" ? "bg-white" : "bg-amber-500"}`} />
                    Medium
                  </Button>
                  <Button
                    variant={priority === "high" ? "default" : "outline"}
                    className={priority === "high" ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => setPriority("high")}
                    size="sm"
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${priority === "high" ? "bg-white" : "bg-red-500"}`} />
                    High
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Assign To</Label>
                <div className="flex gap-2">
                  <Select value={assigneeType} onValueChange={setAssigneeType}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {assigneeType !== "unassigned" && (
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={`Select ${assigneeType}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeType === "technician" && technicians.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                        {assigneeType === "vendor" && vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {propertyId && (
                  <Select value={spaceId} onValueChange={setSpaceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Space (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {spaces.filter(s => s.propertyId === propertyId).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.floor})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {propertyId && (
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Equipment (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {equipment.filter(e => e.propertyId === propertyId).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* EXPANDABLE SECTIONS */}
        <div className="space-y-3 mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Additional Details</h2>
          
          {/* 1. Description */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors hover-elevate"
              onClick={() => toggleSection("description")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Description</h3>
                  <p className="text-xs text-muted-foreground">Add detailed notes and context</p>
                </div>
              </div>
              {expandedSections["description"] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {expandedSections["description"] && (
              <div className="p-4 pt-0 border-l-2 border-primary/40 ml-4 mb-4 mr-4 mt-2">
                <Textarea 
                  placeholder="Provide any additional details about the task..." 
                  className="min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 2. Schedule */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors hover-elevate"
              onClick={() => toggleSection("schedule")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Schedule</h3>
                  <p className="text-xs text-muted-foreground">Set dates, times, and recurrence</p>
                </div>
              </div>
              {expandedSections["schedule"] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {expandedSections["schedule"] && (
              <div className="p-4 pt-0 border-l-2 border-blue-400/40 ml-4 mb-4 mr-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Time (Optional)</Label>
                  <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
                <div className="space-y-2 flex items-center pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(c) => setIsRecurring(!!c)} />
                    <Label htmlFor="recurring" className="cursor-pointer">Make this a recurring task</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Sub-tasks */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors hover-elevate"
              onClick={() => toggleSection("subtasks")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-md">
                  <Layers className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium">Sub-tasks</h3>
                  <p className="text-xs text-muted-foreground">Break task down into smaller steps</p>
                </div>
              </div>
              {expandedSections["subtasks"] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {expandedSections["subtasks"] && (
              <div className="p-4 pt-0 border-l-2 border-amber-400/40 ml-4 mb-4 mr-4 mt-2 space-y-3">
                {subtasks.map((st, index) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                      {index + 1}
                    </div>
                    <Input 
                      placeholder="Sub-task title..." 
                      value={st.title} 
                      onChange={(e) => updateSubtask(st.id, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeSubtask(st.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSubtask} className="mt-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            )}
          </div>

          {/* 4. Checklists */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors hover-elevate"
              onClick={() => toggleSection("checklists")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-md">
                  <ListChecks className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium">Checklists</h3>
                  <p className="text-xs text-muted-foreground">Apply templates or create lists</p>
                </div>
              </div>
              {expandedSections["checklists"] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {expandedSections["checklists"] && (
              <div className="p-4 pt-0 border-l-2 border-emerald-400/40 ml-4 mb-4 mr-4 mt-2 space-y-4">
                <div className="space-y-2">
                  <Label>Apply Template</Label>
                  <Select value={selectedTemplate} onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a checklist template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {checklistTemplates.map(ct => (
                        <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {checklistGroups.length > 0 && (
                  <div className="bg-muted/30 p-4 rounded-md border mt-4">
                    <h4 className="font-medium mb-3">{checklistGroups[0].name} Checklist</h4>
                    <ul className="space-y-2">
                      {checklistGroups[0].items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Checkbox id={`check-${idx}`} disabled />
                          <Label htmlFor={`check-${idx}`} className="text-sm font-normal text-muted-foreground cursor-not-allowed">
                            {item}
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Contact Info */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors hover-elevate"
              onClick={() => toggleSection("contact")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-md">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium">Point of Contact</h3>
                  <p className="text-xs text-muted-foreground">Who requested this or should be notified</p>
                </div>
              </div>
              {expandedSections["contact"] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {expandedSections["contact"] && (
              <div className="p-4 pt-0 border-l-2 border-indigo-400/40 ml-4 mb-4 mr-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Type</Label>
                  <Select value={contactType} onValueChange={setContactType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="staff">Staff / Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contactType === "student" && (
                  <div className="space-y-2">
                    <Label>Select Student</Label>
                    <Select value={contactId} onValueChange={setContactId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {contactType === "staff" && (
                  <div className="space-y-2">
                    <Label>Select Staff</Label>
                    <Select value={contactId} onValueChange={setContactId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search staff..." />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.filter(t => t.role === "admin").map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Advanced */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors hover-elevate"
              onClick={() => toggleSection("advanced")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <Settings2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h3 className="font-medium">Advanced Settings</h3>
                  <p className="text-xs text-muted-foreground">Task type, project links, requirements</p>
                </div>
              </div>
              {expandedSections["advanced"] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {expandedSections["advanced"] && (
              <div className="p-4 pt-0 border-l-2 border-slate-400/40 ml-4 mb-4 mr-4 mt-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Task Type</Label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">General Maintenance</SelectItem>
                        <SelectItem value="preventative">Preventative</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="setup">Event Setup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Special Instructions (Private)</Label>
                  <Textarea 
                    placeholder="Internal notes not visible to requesters..." 
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="req-photo" checked={requiresPhoto} onCheckedChange={(c) => setRequiresPhoto(!!c)} />
                    <Label htmlFor="req-photo" className="font-normal cursor-pointer">Require technician to upload a photo upon completion</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="req-est" checked={requiresEstimate} onCheckedChange={(c) => setRequiresEstimate(!!c)} />
                    <Label htmlFor="req-est" className="font-normal cursor-pointer">Requires cost estimate before starting work</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FIXED FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground hidden sm:block">
            {filledSections} of 6 optional sections filled
          </p>
          <div className="flex gap-3 ml-auto">
            <Button variant="outline">Cancel</Button>
            <Button disabled={!taskName || !propertyId} className="min-w-[120px]">
              Create Task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
