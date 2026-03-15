import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, Plus, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, InsertTask, User } from "@shared/schema";

interface Area {
  id: string;
  name: string;
}

interface Subdivision {
  id: string;
  name: string;
  areaId: string;
}

interface SubtaskEdit {
  id?: string;
  name: string;
  description: string;
  isNew: boolean;
  isRemoved: boolean;
}

interface TaskEditModeProps {
  taskId: string;
  task: Task;
  subtasks: Task[];
  onCancel: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  variant?: "desktop" | "mobile";
}

export function TaskEditMode({
  taskId,
  task,
  subtasks,
  onCancel,
  onSaved,
  onDeleted,
  variant = "desktop",
}: TaskEditModeProps) {
  const { toast } = useToast();

  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [urgency, setUrgency] = useState<string>(task.urgency);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(
    task.estimatedCompletionDate
      ? new Date(task.estimatedCompletionDate).toISOString().split("T")[0]
      : ""
  );
  const [areaId, setAreaId] = useState<string>(task.areaId || "");
  const [subdivisionId, setSubdivisionId] = useState<string>(task.subdivisionId || "");
  const [assignedToId, setAssignedToId] = useState<string>(task.assignedToId || "");

  const [editSubtasks, setEditSubtasks] = useState<SubtaskEdit[]>(
    subtasks.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || "",
      isNew: false,
      isRemoved: false,
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions } = useQuery<Subdivision[]>({
    queryKey: ["/api/subdivisions", areaId],
    queryFn: async () => {
      if (!areaId) return [];
      const res = await fetch(`/api/subdivisions/${areaId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!areaId,
  });

  useEffect(() => {
    setName(task.name);
    setDescription(task.description || "");
    setUrgency(task.urgency);
    setEstimatedCompletionDate(
      task.estimatedCompletionDate
        ? new Date(task.estimatedCompletionDate).toISOString().split("T")[0]
        : ""
    );
    setAreaId(task.areaId || "");
    setSubdivisionId(task.subdivisionId || "");
    setAssignedToId(task.assignedToId || "");
  }, [task.id]);

  useEffect(() => {
    setEditSubtasks(
      subtasks.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        isNew: false,
        isRemoved: false,
      }))
    );
  }, [subtasks.length, task.id]);

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
      if (onDeleted) onDeleted();
      else onCancel();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });

  const addSubtask = () => {
    setEditSubtasks((prev) => [
      ...prev,
      { name: "", description: "", isNew: true, isRemoved: false },
    ]);
  };

  const removeSubtask = (index: number) => {
    setEditSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isRemoved: true } : s))
    );
  };

  const updateSubtaskName = (index: number, newName: string) => {
    setEditSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: newName } : s))
    );
  };

  const updateSubtaskDescription = (index: number, newDesc: string) => {
    setEditSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, description: newDesc } : s))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const patchData: Partial<InsertTask> = {};
      if (name !== task.name) patchData.name = name;
      if (description !== (task.description || "")) patchData.description = description;
      if (urgency !== task.urgency) patchData.urgency = urgency as InsertTask["urgency"];

      const origAreaId = task.areaId || "";
      if (areaId !== origAreaId) patchData.areaId = areaId || null;

      const origSubdivisionId = task.subdivisionId || "";
      if (subdivisionId !== origSubdivisionId) patchData.subdivisionId = subdivisionId || null;

      const origAssignedToId = task.assignedToId || "";
      if (assignedToId !== origAssignedToId) patchData.assignedToId = assignedToId || null;

      const origDate = task.estimatedCompletionDate
        ? new Date(task.estimatedCompletionDate).toISOString().split("T")[0]
        : "";
      if (estimatedCompletionDate !== origDate) {
        patchData.estimatedCompletionDate = estimatedCompletionDate ? new Date(estimatedCompletionDate) : null;
      }

      if (Object.keys(patchData).length > 0) {
        await apiRequest("PATCH", `/api/tasks/${taskId}`, patchData);
      }

      for (const sub of editSubtasks) {
        if (sub.isRemoved && sub.id) {
          await apiRequest("DELETE", `/api/tasks/${sub.id}`);
        } else if (sub.isNew && !sub.isRemoved && sub.name.trim()) {
          await apiRequest("POST", `/api/tasks/${taskId}/subtasks`, {
            name: sub.name.trim(),
            description: sub.description.trim() || undefined,
          });
        } else if (!sub.isNew && !sub.isRemoved && sub.id) {
          const original = subtasks.find((s) => s.id === sub.id);
          if (original && original.name !== sub.name && sub.name.trim()) {
            await apiRequest("PATCH", `/api/tasks/${sub.id}`, { name: sub.name.trim() });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
      onSaved();
    } catch {
      toast({ title: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isMobile = variant === "mobile";
  const containerClass = isMobile
    ? "min-h-screen flex flex-col"
    : "flex flex-col h-full";
  const bgColor = isMobile ? "#F8F8F8" : "#FFFFFF";

  const activeSubtasks = editSubtasks.filter((s) => !s.isRemoved);

  return (
    <div className={containerClass} style={{ backgroundColor: bgColor }} data-testid="task-edit-mode">
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #EEEEEE", backgroundColor: "#FFFFFF" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-1 rounded"
            data-testid="button-edit-cancel"
            aria-label="Cancel editing"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
            Edit Task
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            data-testid="button-edit-discard"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            style={{ backgroundColor: "#4338CA", color: "#FFFFFF" }}
            data-testid="button-edit-save"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Title
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task title"
            data-testid="input-edit-title"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Priority
          </Label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger data-testid="select-edit-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Assignee
          </Label>
          <Select
            value={assignedToId || "__none__"}
            onValueChange={(v) => setAssignedToId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger data-testid="select-edit-assignee">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {(["admin", "technician", "staff", "student"] as const).map((role) => {
                const roleUsers = (allUsers || []).filter((u) => u.role === role);
                if (roleUsers.length === 0) return null;
                return roleUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username} ({role})
                  </SelectItem>
                ));
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Location
          </Label>
          <Select
            value={areaId || "__none__"}
            onValueChange={(v) => {
              setAreaId(v === "__none__" ? "" : v);
              setSubdivisionId("");
            }}
          >
            <SelectTrigger data-testid="select-edit-location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No location</SelectItem>
              {(areas || []).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {areaId && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Sub-area
            </Label>
            <Select
              value={subdivisionId || "__none__"}
              onValueChange={(v) => setSubdivisionId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger data-testid="select-edit-subarea">
                <SelectValue placeholder="Select sub-area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No sub-area</SelectItem>
                {(subdivisions || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Due Date
          </Label>
          <Input
            type="date"
            value={estimatedCompletionDate}
            onChange={(e) => setEstimatedCompletionDate(e.target.value)}
            data-testid="input-edit-due-date"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Description
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description"
            className="resize-none"
            style={{ minHeight: "80px" }}
            data-testid="input-edit-description"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Subtasks ({activeSubtasks.length})
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addSubtask}
              data-testid="button-edit-add-subtask"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Subtask
            </Button>
          </div>

          {activeSubtasks.length === 0 ? (
            <p className="text-xs py-3 text-center" style={{ color: "#9CA3AF" }}>
              No subtasks
            </p>
          ) : (
            <div className="space-y-3">
              {editSubtasks.map((sub, index) => {
                if (sub.isRemoved) return null;
                return (
                  <div
                    key={sub.id || `new-${index}`}
                    className="space-y-1.5 rounded p-2"
                    style={{ backgroundColor: isMobile ? "#FFFFFF" : "#F9FAFB" }}
                    data-testid={`edit-subtask-row-${sub.id || index}`}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={sub.name}
                        onChange={(e) => updateSubtaskName(index, e.target.value)}
                        placeholder={sub.isNew ? "New subtask name" : "Subtask name"}
                        className="flex-1"
                        data-testid={`input-edit-subtask-${sub.id || index}`}
                      />
                      <button
                        onClick={() => removeSubtask(index)}
                        className="shrink-0 p-1.5 rounded"
                        style={{ color: "#D94F4F" }}
                        data-testid={`button-remove-subtask-${sub.id || index}`}
                        aria-label={`Remove subtask ${sub.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {sub.isNew && (
                      <Input
                        value={sub.description}
                        onChange={(e) => updateSubtaskDescription(index, e.target.value)}
                        placeholder="Description (optional)"
                        className="text-xs"
                        data-testid={`input-edit-subtask-desc-${index}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="pt-4 mt-4"
          style={{ borderTop: "1px solid #EEEEEE" }}
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setDeleteDialogOpen(true)}
            style={{ borderColor: "#FECACA", color: "#D94F4F", backgroundColor: "#FEF2F2" }}
            data-testid="button-edit-delete"
          >
            Delete Task
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All subtasks, notes, and attachments
              associated with this task will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate()}
              disabled={deleteTaskMutation.isPending}
              style={{ backgroundColor: "#D94F4F", color: "#FFFFFF" }}
              data-testid="button-delete-confirm"
            >
              {deleteTaskMutation.isPending ? "Deleting..." : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
