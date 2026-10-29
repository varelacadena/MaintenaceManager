import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { equipmentKeys, fetchEquipmentList } from "@/lib/equipmentQueries";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateTaskLists } from "@/lib/taskQueryInvalidation";
import { dateInputValueToTaskTimestamp } from "@/lib/taskCalendarDates";
import { getSignedUploadParameters, inferUploadFileType } from "@/lib/uploadUtils";
import { preparePhotoForUpload } from "@/lib/preparePhotoForUpload";
import { sortByName } from "@/lib/propertyDisplayUtils";
import { getUserDisplayName } from "@/utils/taskUtils";
import type { Equipment, Project, Property, ServiceRequest, Space, User, Vendor } from "@shared/schema";

type RepeatMode = "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
type CustomUnit = "days" | "weeks" | "months" | "years";
type MoreTool = "" | "subtasks" | "checklist" | "project" | "space" | "equipment" | "contact" | "instructions" | "helpers";
type PersonKind = "technician" | "student" | "vendor";

type Person = { id: string; label: string; kind: PersonKind };

const REPEAT_OPTIONS: { id: RepeatMode; label: string }[] = [
  { id: "once", label: "Once" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "custom", label: "Custom" },
];

const UNITS: CustomUnit[] = ["days", "weeks", "months", "years"];

const triggerClass =
  "flex h-9 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-border border-b-foreground/25 bg-background text-left text-xs text-foreground sm:h-8 sm:w-auto";

function TriggerFace({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 items-center truncate px-2.5">{label || placeholder}</span>
      <span className="flex shrink-0 items-center border-l border-border bg-muted px-2 text-[10px] text-muted-foreground">▾</span>
    </>
  );
}

function repeatLabel(mode: RepeatMode, every: string, unit: CustomUnit): string {
  if (mode === "once") return "";
  if (mode === "custom") {
    const count = Math.max(1, Number(every) || 1);
    return `Every ${count} ${unit}`;
  }
  return mode[0].toUpperCase() + mode.slice(1);
}

function dueFace(due: Date | undefined, mode: RepeatMode, every: string, unit: CustomUnit): string {
  const date = due ? format(due, "MMM d") : "";
  const repeat = repeatLabel(mode, every, unit);
  if (date && repeat) return `${date} · ${repeat}`;
  return date || repeat;
}

function propertyFace(ids: string[], properties: Property[]): string {
  if (ids.length === 0) return "";
  const first = properties.find((property) => property.id === ids[0])?.name || "Property";
  if (ids.length === 1) return first;
  return `${first} +${ids.length - 1}`;
}

export function WorkTaskComposer({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const acceptRef = useRef("image/*");
  const search = useSearch();
  const params = new URLSearchParams(search);
  const requestId = params.get("requestId") || "";
  const projectFromUrl = params.get("projectId") || "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [whoId, setWhoId] = useState("");
  const [whoKind, setWhoKind] = useState<PersonKind | "">("");
  const [due, setDue] = useState<Date | undefined>();
  const [repeat, setRepeat] = useState<RepeatMode>("once");
  const [customEvery, setCustomEvery] = useState("2");
  const [customUnit, setCustomUnit] = useState<CustomUnit>("weeks");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [moreTool, setMoreTool] = useState<MoreTool>("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [projectId, setProjectId] = useState(projectFromUrl);
  const [spaceId, setSpaceId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [contact, setContact] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [helpers, setHelpers] = useState<string[]>([]);
  const [estimate, setEstimate] = useState(false);
  const [lifeSafety, setLifeSafety] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [open, setOpen] = useState<"" | "who" | "due" | "priority" | "property" | "more" | "files">("");

  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: vendors = [] } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: request } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", requestId],
    enabled: !!requestId,
  });

  const singleProperty = propertyIds.length === 1 ? propertyIds[0] : "";
  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces", singleProperty],
    enabled: !!singleProperty,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/spaces?propertyId=${singleProperty}`);
      return response.json();
    },
  });
  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: equipmentKeys.list({ propertyId: singleProperty }),
    enabled: !!singleProperty,
    queryFn: () => fetchEquipmentList({ propertyId: singleProperty }),
  });

  useEffect(() => {
    if (!request) return;
    setName(request.title || "");
    const categoryNote = request.category?.trim() ? `Category: ${request.category.trim()}` : "";
    setDescription([request.description, categoryNote].filter(Boolean).join("\n\n"));
    if (request.urgency === "low" || request.urgency === "medium" || request.urgency === "high") {
      setPriority(request.urgency);
    }
    if (request.propertyId) setPropertyIds([request.propertyId]);
    if (request.spaceId) setSpaceId(request.spaceId);
    setContact(request.requesterName || "");
    setContactEmail(request.requesterId ? "" : request.requesterEmail || "");
    setContactPhone(request.requesterId ? "" : request.requesterPhone || "");
  }, [request]);

  useEffect(() => {
    if (projectFromUrl) setProjectId(projectFromUrl);
  }, [projectFromUrl]);

  useEffect(() => {
    if (!requestId && !projectFromUrl) return;
    document.getElementById("work-task-composer")?.scrollIntoView({ block: "start" });
  }, [requestId, projectFromUrl]);

  useEffect(() => {
    if (propertyIds.length === 1) return;
    setSpaceId("");
    setEquipmentId("");
  }, [propertyIds]);

  const people: Person[] = [
    ...users.filter((user) => user.role === "technician").map((user) => ({ id: user.id, label: getUserDisplayName(user), kind: "technician" as const })),
    ...users.filter((user) => user.role === "student").map((user) => ({ id: user.id, label: getUserDisplayName(user), kind: "student" as const })),
    ...vendors.map((vendor) => ({ id: vendor.id, label: vendor.name, kind: "vendor" as const })),
  ];
  const who = people.find((person) => person.id === whoId);
  const activeProjects = projects.filter((project) => project.status === "in_progress" || project.status === "planning");

  const moreCount = [
    subtasks.length > 0,
    checklist.length > 0,
    !!projectId,
    !!spaceId,
    !!equipmentId,
    !!contact,
    whoKind === "student" && !!instructions.trim(),
    helpers.length > 0,
    estimate,
    lifeSafety,
    photo,
  ].filter(Boolean).length;

  function reset() {
    setName("");
    setDescription("");
    setWhoId("");
    setWhoKind("");
    setDue(undefined);
    setRepeat("once");
    setCustomEvery("2");
    setCustomUnit("weeks");
    setPriority("medium");
    setPropertyIds([]);
    setFiles([]);
    setMoreTool("");
    setSubtasks([]);
    setSubtaskDraft("");
    setChecklist([]);
    setChecklistDraft("");
    setProjectId(projectFromUrl);
    setSpaceId("");
    setEquipmentId("");
    setContact("");
    setContactEmail("");
    setContactPhone("");
    setInstructions("");
    setHelpers([]);
    setEstimate(false);
    setLifeSafety(false);
    setPhoto(false);
    setOpen("");
  }

  const createTask = useMutation({
    mutationFn: async () => {
      if (lifeSafety && propertyIds.length === 0) {
        throw new Error("Choose a property for this life safety round");
      }
      const start = new Date();
      const completion = due || start;
      const customFrequency = customUnit === "days" ? "daily" : customUnit === "weeks" ? "weekly" : customUnit === "months" ? "monthly" : "yearly";
      const frequency = lifeSafety ? "weekly" : repeat === "once" ? undefined : repeat === "custom" ? customFrequency : repeat;
      const interval = lifeSafety ? 1 : repeat === "once" ? undefined : repeat === "custom" ? Math.max(1, Number(customEvery) || 1) : 1;
      const manyProperties = propertyIds.length > 1;
      const taskName = name.trim() || (lifeSafety ? "Weekly life safety" : "");
      const taskDescription = description.trim() || (lifeSafety ? "Sound each smoke detector alarm. Confirm each exit sign is lit. Scan the sticker on that unit." : "");
      const taskData = {
        name: taskName,
        description: taskDescription,
        urgency: priority,
        initialDate: start.toISOString(),
        estimatedCompletionDate: dateInputValueToTaskTimestamp(format(completion, "yyyy-MM-dd")),
        propertyId: manyProperties ? undefined : propertyIds[0] || undefined,
        propertyIds: manyProperties ? propertyIds : undefined,
        spaceId: manyProperties || lifeSafety ? undefined : spaceId || undefined,
        equipmentId: manyProperties || lifeSafety ? undefined : equipmentId || undefined,
        assignedToId: whoKind === "vendor" ? undefined : whoId || undefined,
        assignedVendorId: whoKind === "vendor" ? whoId || undefined : undefined,
        executorType: whoKind === "technician" || whoKind === "student" ? whoKind : undefined,
        taskType: lifeSafety || repeat !== "once" ? "recurring" : "one_time",
        recurringFrequency: frequency,
        recurringInterval: interval,
        instructions: whoKind === "student" ? instructions.trim() || undefined : undefined,
        requiresPhoto: photo,
        requiresEstimate: estimate,
        estimateStatus: estimate ? "needs_estimate" : undefined,
        status: estimate ? "needs_estimate" : "not_started",
        requestId: requestId || undefined,
        projectId: projectId || undefined,
        contactType: requestId ? "requester" : contact ? "other" : undefined,
        contactName: contact || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        areaId: request?.areaId || undefined,
        lifeSafetyRound: lifeSafety,
        helperUserIds: helpers.length > 0 ? helpers : undefined,
        checklistGroups: lifeSafety || checklist.length === 0 ? undefined : [{
          name: "Checklist",
          items: checklist.map((text) => ({ text, isCompleted: false })),
        }],
      };
      const response = await apiRequest("POST", "/api/tasks", taskData);
      const created = await response.json();
      let followUpFailed = false;
      if (created.id) {
        try {
          if (!lifeSafety) {
            for (const subtask of subtasks) {
              await apiRequest("POST", `/api/tasks/${created.id}/subtasks`, { name: subtask });
            }
          }
          for (const file of files) {
            const prepared = await preparePhotoForUpload(file);
            const fileType = inferUploadFileType(prepared);
            const { url, objectPath } = await getSignedUploadParameters();
            const isMock = url.startsWith("https://mock-storage.local/");
            let objectUrl = url;
            if (!isMock) {
              const uploadRes = await fetch(url, { method: "PUT", body: prepared, headers: { "Content-Type": fileType } });
              if (!uploadRes.ok) throw new Error("Upload failed");
              objectUrl = url.split("?")[0];
            }
            await apiRequest("PUT", "/api/uploads", {
              taskId: created.id,
              fileName: prepared.name,
              fileType,
              objectUrl,
              objectPath,
              label: prepared.name,
            });
          }
        } catch {
          followUpFailed = true;
        }
      }
      return { ...created, uploadFailed: followUpFailed };
    },
    onSuccess: (created: { createdTaskIds?: string[]; uploadFailed?: boolean }) => {
      invalidateTaskLists();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (requestId) queryClient.invalidateQueries({ queryKey: ["/api/service-requests", requestId] });
      const createdCount = Array.isArray(created.createdTaskIds) ? created.createdTaskIds.length : 0;
      toast({
        title: created.uploadFailed
          ? "Task created"
          : requestId
            ? "Request approved"
            : createdCount > 1
              ? "Life safety rounds created"
              : "Task created",
        description: created.uploadFailed
          ? "The task is on this list. Open it to finish subtasks or attachments."
          : createdCount > 1
            ? `${createdCount} weekly jobs were created, one for each property.`
            : "It is on this list.",
        variant: created.uploadFailed ? "destructive" : undefined,
      });
      reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Could not create the task", description: error.message, variant: "destructive" });
    },
  });

  function pickAttachment(kind: "photo" | "video" | "document") {
    acceptRef.current = kind === "photo" ? "image/*" : kind === "video" ? "video/*" : ".pdf,.doc,.docx,.xls,.xlsx,.txt";
    if (fileRef.current) {
      fileRef.current.accept = acceptRef.current;
      fileRef.current.click();
    }
    setOpen("");
  }

  const menuClass = "w-[min(18rem,calc(100vw-2rem))] p-1";

  return (
    <div id="work-task-composer" className="border-b bg-muted/40 p-3" data-testid="work-task-composer">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) setFiles((current) => [...current, selected]);
          event.target.value = "";
        }}
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Task name"
        className="h-9 bg-background text-sm"
        data-testid="input-task-name"
      />
      <div className="relative mt-2">
        <p className="mb-1 text-xs text-muted-foreground">Description</p>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Tell the tech what's going on"
          rows={3}
          className="min-h-[5.5rem] resize-y bg-background pb-9 text-sm"
          data-testid="textarea-description"
        />
        <div className="absolute bottom-2 left-2 right-2 flex min-w-0 items-center gap-2">
          <Popover open={open === "files"} onOpenChange={(next) => setOpen(next ? "files" : "")}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                aria-label="Attachments"
                data-testid="button-attachments"
              >
                <Paperclip className={`h-4 w-4 ${files.length > 0 ? "text-primary" : ""}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className={menuClass}>
              {([
                ["photo", "Photo", "Camera or gallery"],
                ["video", "Video", "A clip of the problem"],
                ["document", "Document", "PDF or other file"],
              ] as const).map(([kind, label, detail]) => (
                <button
                  key={kind}
                  type="button"
                  className="flex w-full flex-col rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => pickAttachment(kind)}
                >
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">{detail}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
          {files.length > 0 ? (
            <p className="min-w-0 truncate text-xs text-muted-foreground">{files.map((file) => file.name).join(" · ")}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Popover open={open === "who"} onOpenChange={(next) => setOpen(next ? "who" : "")}>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass} data-testid="button-who">
              <TriggerFace label={who?.label || ""} placeholder="Who" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className={`${menuClass} max-h-72 overflow-auto`}>
            <button type="button" className="w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted" onClick={() => { setWhoId(""); setWhoKind(""); setOpen(""); }}>
              Unassigned
            </button>
            {(["technician", "student", "vendor"] as const).map((kind) => {
              const group = people.filter((person) => person.kind === kind);
              if (group.length === 0) return null;
              const title = kind === "technician" ? "Technicians" : kind === "student" ? "Students" : "Vendors";
              return (
                <div key={kind} className="mt-1 border-t pt-1">
                  <p className="px-2.5 py-1 text-xs font-semibold text-muted-foreground">{title}</p>
                  {group.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      className={`w-full rounded-md border-l-2 px-2.5 py-2 text-left text-sm hover:bg-muted ${whoId === person.id ? "border-primary bg-muted font-semibold" : "border-transparent"}`}
                      onClick={() => { setWhoId(person.id); setWhoKind(person.kind); setOpen(""); }}
                    >
                      {person.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>

        <Popover open={open === "due"} onOpenChange={(next) => setOpen(next ? "due" : "")}>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass} data-testid="button-due">
              <TriggerFace label={dueFace(due, repeat, customEvery, customUnit)} placeholder="Due date" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-[70vh] w-[min(18rem,calc(100vw-2rem))] overflow-auto p-2">
            <Calendar mode="single" selected={due} onSelect={setDue} />
            <button type="button" className="mt-1 text-xs text-muted-foreground" onClick={() => setDue(undefined)}>
              No date
            </button>
            <div className="mt-2 border-t pt-2">
              <p className="mb-1.5 text-xs text-muted-foreground">Frequency</p>
              <div className="flex flex-wrap gap-1">
                {REPEAT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`h-7 rounded-full border px-2 text-xs ${repeat === option.id ? "border-primary bg-muted font-semibold" : "border-border"}`}
                    onClick={() => setRepeat(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {repeat === "custom" ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground">Every</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      value={customEvery}
                      onChange={(event) => setCustomEvery(event.target.value.replace(/[^\d]/g, ""))}
                      className="h-8 w-16"
                    />
                    {UNITS.map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        className={`h-7 rounded-full border px-2 text-xs ${customUnit === unit ? "border-primary bg-muted font-semibold" : "border-border"}`}
                        onClick={() => setCustomUnit(unit)}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={open === "priority"} onOpenChange={(next) => setOpen(next ? "priority" : "")}>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass} data-testid="button-priority">
              <TriggerFace label={priority[0].toUpperCase() + priority.slice(1)} placeholder="Priority" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(12rem,calc(100vw-2rem))] p-1">
            {(["low", "medium", "high"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`w-full rounded-md border-l-2 px-2.5 py-2 text-left text-sm capitalize hover:bg-muted ${priority === value ? "border-primary bg-muted font-semibold" : "border-transparent"}`}
                onClick={() => { setPriority(value); setOpen(""); }}
              >
                {value}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover open={open === "property"} onOpenChange={(next) => setOpen(next ? "property" : "")}>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass} data-testid="button-property">
              <TriggerFace label={propertyFace(propertyIds, properties)} placeholder="Property" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className={`${menuClass} max-h-72 overflow-auto`}>
            <p className="px-2.5 py-1 text-xs text-muted-foreground">Check every property on this task</p>
            {sortByName(properties).map((property) => {
              const checked = propertyIds.includes(property.id);
              return (
                <label key={property.id} className={`flex items-center gap-2 rounded-md border-l-2 px-2.5 py-2 text-sm ${checked ? "border-primary bg-muted" : "border-transparent"}`}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      setPropertyIds((current) => (next ? [...current, property.id] : current.filter((id) => id !== property.id)))
                    }
                  />
                  <span className="min-w-0 truncate">{property.name}</span>
                </label>
              );
            })}
          </PopoverContent>
        </Popover>

        <Popover open={open === "more"} onOpenChange={(next) => { setOpen(next ? "more" : ""); if (!next) setMoreTool(""); }}>
          <PopoverTrigger asChild>
            <button type="button" className={triggerClass} data-testid="button-more">
              <TriggerFace label={moreCount > 0 ? `More · ${moreCount}` : ""} placeholder="More" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className={`${menuClass} max-h-[70vh] overflow-auto`}>
            {moreTool === "" ? (
              <div className="space-y-1">
                {([
                  ["subtasks", "Subtasks", subtasks.length ? String(subtasks.length) : ""],
                  ["checklist", "Checklist", checklist.length ? String(checklist.length) : ""],
                  ["project", "Project", activeProjects.find((project) => project.id === projectId)?.name || ""],
                  ["space", "Space", spaces.find((space) => space.id === spaceId)?.name || ""],
                  ["equipment", "Equipment", equipment.find((item) => item.id === equipmentId)?.name || ""],
                  ["contact", "Contact", contact],
                  ...(whoKind === "student" ? [["instructions", "Instructions", instructions] as const] : []),
                  ["helpers", "Helpers", helpers.length ? String(helpers.length) : ""],
                ] as const).map(([id, label, detail]) => (
                  <button
                    key={id}
                    type="button"
                    className="flex h-8 w-full items-stretch overflow-hidden rounded-lg border border-border border-b-foreground/25 bg-background text-left text-xs"
                    onClick={() => setMoreTool(id)}
                  >
                    <span className="flex min-w-0 flex-1 items-center truncate px-2.5">{label}</span>
                    <span className="flex shrink-0 items-center gap-1.5 border-l border-border bg-muted px-2 text-muted-foreground">
                      {detail ? <span className="max-w-[5rem] truncate">{detail}</span> : null}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
                <div className="space-y-1 border-t pt-1">
                  <label className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm ${estimate ? "border-primary bg-muted" : "border-transparent"}`}>
                    <Checkbox checked={estimate} onCheckedChange={(checked) => setEstimate(!!checked)} />
                    Require cost estimate
                  </label>
                  <label className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm ${lifeSafety ? "border-primary bg-muted" : "border-transparent"}`}>
                    <Checkbox checked={lifeSafety} onCheckedChange={(checked) => setLifeSafety(!!checked)} />
                    Life safety round
                  </label>
                  <label className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm ${photo ? "border-primary bg-muted" : "border-transparent"}`}>
                    <Checkbox checked={photo} onCheckedChange={(checked) => setPhoto(!!checked)} />
                    Finished-work photo
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex h-8 w-full items-stretch overflow-hidden rounded-lg border border-border border-b-foreground/25 bg-muted/60 text-left text-xs font-semibold"
                  onClick={() => setMoreTool("")}
                >
                  <span className="flex items-center border-r border-border bg-muted px-2 text-primary">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex items-center px-2.5">All tools</span>
                </button>
                {moreTool === "subtasks" || moreTool === "checklist" ? (
                  <ListEditor
                    title={moreTool === "subtasks" ? "Subtasks" : "Checklist"}
                    items={moreTool === "subtasks" ? subtasks : checklist}
                    draft={moreTool === "subtasks" ? subtaskDraft : checklistDraft}
                    placeholder={moreTool === "subtasks" ? "Subtask name" : "Checklist item"}
                    onDraft={moreTool === "subtasks" ? setSubtaskDraft : setChecklistDraft}
                    onAdd={() => {
                      const value = (moreTool === "subtasks" ? subtaskDraft : checklistDraft).trim();
                      if (!value) return;
                      if (moreTool === "subtasks") {
                        setSubtasks((current) => [...current, value]);
                        setSubtaskDraft("");
                      } else {
                        setChecklist((current) => [...current, value]);
                        setChecklistDraft("");
                      }
                    }}
                    onRemove={(item) => {
                      if (moreTool === "subtasks") setSubtasks((current) => current.filter((entry) => entry !== item));
                      else setChecklist((current) => current.filter((entry) => entry !== item));
                    }}
                  />
                ) : null}
                {moreTool === "project" ? (
                  <OptionList
                    title="Project"
                    selected={projectId}
                    options={[{ id: "", label: "None" }, ...activeProjects.map((project) => ({ id: project.id, label: project.name }))]}
                    onPick={setProjectId}
                  />
                ) : null}
                {moreTool === "space" ? (
                  <OptionList
                    title="Space"
                    selected={spaceId}
                    options={[{ id: "", label: "None" }, ...sortByName(spaces).map((space) => ({ id: space.id, label: space.name }))]}
                    onPick={setSpaceId}
                  />
                ) : null}
                {moreTool === "equipment" ? (
                  <OptionList
                    title="Equipment"
                    selected={equipmentId}
                    options={[{ id: "", label: "None" }, ...sortByName(equipment).map((item) => ({ id: item.id, label: item.name }))]}
                    onPick={setEquipmentId}
                  />
                ) : null}
                {moreTool === "contact" ? (
                  <label className="block space-y-1 px-1">
                    <span className="text-xs font-semibold">Contact</span>
                    <Input value={contact} placeholder="Name, phone, or email" onChange={(event) => setContact(event.target.value)} className="h-8" />
                  </label>
                ) : null}
                {moreTool === "instructions" ? (
                  <label className="block space-y-1 px-1">
                    <span className="text-xs font-semibold">Instructions</span>
                    <Textarea value={instructions} placeholder="Step-by-step instructions for the student" rows={3} onChange={(event) => setInstructions(event.target.value)} />
                  </label>
                ) : null}
                {moreTool === "helpers" ? (
                  <div className="space-y-1">
                    <p className="px-1 text-xs font-semibold">Helpers</p>
                    {people.filter((person) => person.kind !== "vendor" && person.id !== whoId).map((person) => {
                      const checked = helpers.includes(person.id);
                      return (
                        <label key={person.id} className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm ${checked ? "border-primary bg-muted" : "border-transparent"}`}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setHelpers((current) => (next ? [...current, person.id] : current.filter((id) => id !== person.id)))
                            }
                          />
                          {person.label}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 min-h-9 flex-1 rounded-lg px-2 text-xs sm:h-8 sm:min-h-8 sm:flex-none"
          onClick={onClose}
          data-testid="button-cancel-task"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 min-h-9 flex-1 rounded-lg px-2 text-xs sm:h-8 sm:min-h-8 sm:flex-none"
          disabled={(!name.trim() && !lifeSafety) || createTask.isPending}
          onClick={() => createTask.mutate()}
          data-testid="button-submit"
        >
          {createTask.isPending ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}

function ListEditor({
  title,
  items,
  draft,
  placeholder,
  onDraft,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  draft: string;
  placeholder: string;
  onDraft: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
}) {
  return (
    <div className="space-y-2 px-1">
      <p className="text-xs font-semibold">{title}</p>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate">{item}</span>
          <button type="button" className="shrink-0 text-xs text-muted-foreground" onClick={() => onRemove(item)}>
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-1">
        <Input value={draft} placeholder={placeholder} onChange={(event) => onDraft(event.target.value)} className="h-8" />
        <Button type="button" variant="secondary" className="h-8 shrink-0 px-2 text-xs" onClick={onAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}

function OptionList({
  title,
  selected,
  options,
  onPick,
}: {
  title: string;
  selected: string;
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="px-2.5 py-1 text-xs font-semibold">{title}</p>
      {options.map((option) => (
        <button
          key={option.id || "none"}
          type="button"
          className={`w-full rounded-md border-l-2 px-2.5 py-2 text-left text-sm hover:bg-muted ${selected === option.id ? "border-primary bg-muted font-semibold" : "border-transparent"}`}
          onClick={() => onPick(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
