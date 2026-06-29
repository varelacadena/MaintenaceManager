import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { apiRequest } from "@/lib/queryClient";
import { invalidateTaskAfterMutation } from "@/lib/taskQueryInvalidation";
import { PropertySelectItems, NameSelectItems } from "@/components/PropertySelectItems";
import { DatePicker } from "@/components/ui/date-picker";
import { dateInputValueToTaskTimestamp, getTaskDateInputValue, toCalendarDate } from "@/lib/taskCalendarDates";
import { format } from "date-fns";
import type { Task, InsertTask, User, Property, Equipment, Vehicle } from "@shared/schema";
import { TaskAssetListEditor } from "@/components/task-form/TaskAssetListEditor";
import type { SelectedAsset } from "@/components/task-form/TaskLocationFields";
import { equipmentKeys, fetchEquipmentList } from "@/lib/equipmentQueries";
import { isAutoShopName } from "@/lib/autoShopUtils";
import {
  buildAssetsFromTask,
  isAssetSubtask,
  syncTaskAssets,
  type AssetWithSubtaskId,
} from "@/lib/taskAssetSubtasks";
import { cn } from "@/lib/utils";

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

type TaskHelperAssignment = {
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

interface TaskEditModeProps {
  taskId: string;
  task: Task & { helpers?: TaskHelperAssignment[] };
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
    getTaskDateInputValue(task.estimatedCompletionDate)
  );
  const [propertyId, setPropertyId] = useState<string>(task.propertyId || "");
  const [areaId, setAreaId] = useState<string>(task.areaId || "");
  const [subdivisionId, setSubdivisionId] = useState<string>(task.subdivisionId || "");
  const [assignedToId, setAssignedToId] = useState<string>(task.assignedToId || "");
  const [helperUserIds, setHelperUserIds] = useState<string[]>(
    () => task.helpers?.map((helper) => helper.userId) ?? []
  );

  const [editSubtasks, setEditSubtasks] = useState<SubtaskEdit[]>(
    subtasks.filter((s) => !isAssetSubtask(s)).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || "",
      isNew: false,
      isRemoved: false,
    }))
  );

  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const initialAssetsRef = useRef<AssetWithSubtaskId[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: equipmentKeys.list({ propertyId }),
    enabled: !!propertyId,
    queryFn: () => fetchEquipmentList({ propertyId }),
  });

  const selectedProperty = properties?.find((p) => p.id === propertyId);
  const selectedArea = areas?.find((a) => a.id === areaId);
  const showVehicle =
    isAutoShopName(selectedProperty?.name) || isAutoShopName(selectedArea?.name);
  const showAssetEditor =
    selectedAssets.length > 0 ||
    initialAssetsRef.current.length > 0 ||
    showVehicle ||
    !!propertyId;

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
    setEstimatedCompletionDate(getTaskDateInputValue(task.estimatedCompletionDate));
    setPropertyId(task.propertyId || "");
    setAreaId(task.areaId || "");
    setSubdivisionId(task.subdivisionId || "");
    setAssignedToId(task.assignedToId || "");
    setHelperUserIds(task.helpers?.map((helper) => helper.userId) ?? []);
  }, [task.id, task.helpers]);

  useEffect(() => {
    setEditSubtasks(
      subtasks.filter((s) => !isAssetSubtask(s)).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        isNew: false,
        isRemoved: false,
      }))
    );
  }, [subtasks.length, task.id]);

  useEffect(() => {
    const loadedAssets = buildAssetsFromTask(task, subtasks);
    setSelectedAssets(loadedAssets);
    initialAssetsRef.current = loadedAssets;
    setAssetsLoaded(true);
  }, [task.id, subtasks]);

  useEffect(() => {
    if (!showVehicle) {
      setSelectedAssets((prev) => prev.filter((asset) => asset.type !== "vehicle"));
    }
  }, [showVehicle]);

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      invalidateTaskAfterMutation(taskId, { broad: true });
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

  const handleAddAsset = (asset: SelectedAsset) => {
    if (selectedAssets.some((a) => a.type === asset.type && a.id === asset.id)) {
      return;
    }
    setSelectedAssets((prev) => [...prev, asset]);
  };

  const handleRemoveAsset = (index: number) => {
    setSelectedAssets((prev) => prev.filter((_, i) => i !== index));
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

      const origPropertyId = task.propertyId || "";
      if (propertyId !== origPropertyId) patchData.propertyId = propertyId || null;

      const origSubdivisionId = task.subdivisionId || "";
      if (subdivisionId !== origSubdivisionId) patchData.subdivisionId = subdivisionId || null;

      const origAssignedToId = task.assignedToId || "";
      if (assignedToId !== origAssignedToId) patchData.assignedToId = assignedToId || null;

      const originalHelperIds = task.helpers?.map((helper) => helper.userId) ?? [];
      const normalizedHelperIds = helperUserIds.filter((id) => id !== assignedToId);
      const helpersChanged =
        normalizedHelperIds.length !== originalHelperIds.length ||
        normalizedHelperIds.some((id) => !originalHelperIds.includes(id));

      const origDate = getTaskDateInputValue(task.estimatedCompletionDate);
      if (estimatedCompletionDate !== origDate) {
        patchData.estimatedCompletionDate = estimatedCompletionDate
          ? new Date(dateInputValueToTaskTimestamp(estimatedCompletionDate))
          : null;
      }

      if (Object.keys(patchData).length > 0 || helpersChanged) {
        await apiRequest("PATCH", `/api/tasks/${taskId}`, {
          ...patchData,
          ...(helpersChanged ? { helperUserIds: normalizedHelperIds } : {}),
        });
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

      const usesAssetSelection =
        assetsLoaded &&
        (selectedAssets.length > 0 || initialAssetsRef.current.length > 0);
      if (usesAssetSelection) {
        await syncTaskAssets(taskId, initialAssetsRef.current, selectedAssets);
        initialAssetsRef.current = selectedAssets.map((asset) => ({ ...asset }));
      }

      invalidateTaskAfterMutation(taskId, { broad: true });
      toast({ title: "Task updated" });
      onSaved();
    } catch {
      toast({ title: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isMobile = variant === "mobile";

  const activeSubtasks = editSubtasks.filter((s) => !s.isRemoved);

  const saveButton = (
    <Button
      size="sm"
      onClick={handleSave}
      disabled={isSaving}
      className={isMobile ? undefined : "gap-2"}
      style={isMobile ? { backgroundColor: "#4338CA", color: "#FFFFFF" } : undefined}
      data-testid="button-edit-save"
    >
      {isSaving ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Saving...
        </>
      ) : (
        "Save Changes"
      )}
    </Button>
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        isMobile ? "min-h-screen bg-[#F8F8F8]" : "bg-muted/30",
      )}
      data-testid="task-edit-mode"
    >
      <div
        className={cn(
          "flex-1 overflow-y-auto space-y-5",
          isMobile ? "px-4 py-5" : "max-w-6xl mx-auto w-full px-6 py-6",
        )}
      >
        {isMobile && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-edit-cancel"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel editing
          </button>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className={cn("font-semibold text-foreground", isMobile ? "text-xl" : "text-2xl")}>
              Edit Task
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update task details and assignments
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">
            {!isMobile && (
              <Button variant="outline" size="sm" onClick={onCancel} data-testid="button-edit-discard">
                Cancel
              </Button>
            )}
            {saveButton}
          </div>
        </div>

        <div className="space-y-5">
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
            onValueChange={(v) => {
              const nextAssigneeId = v === "__none__" ? "" : v;
              setAssignedToId(nextAssigneeId);
              setHelperUserIds((prev) => prev.filter((id) => id !== nextAssigneeId));
            }}
          >
            <SelectTrigger data-testid="select-edit-assignee">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {([["admin", "Admins"], ["technician", "Technicians"], ["staff", "Staff"], ["student", "Students"]] as const).map(([role, label]) => {
                const roleUsers = (allUsers || []).filter((u) => u.role === role);
                if (roleUsers.length === 0) return null;
                return (
                  <SelectGroup key={role}>
                    <SelectLabel>{label}</SelectLabel>
                    {roleUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Additional Technicians
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {(allUsers || [])
              .filter((u) => u.role === "technician" && u.id !== assignedToId)
              .map((u) => {
                const isSelected = helperUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    data-testid={`edit-additional-tech-toggle-${u.id}`}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover-elevate"
                    }`}
                    onClick={() => {
                      setHelperUserIds((prev) =>
                        isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      );
                    }}
                  >
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                  </button>
                );
              })}
          </div>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            Additional technicians can view and update this task.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Property
          </Label>
          <Select
            value={propertyId || "__none__"}
            onValueChange={(v) => setPropertyId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger data-testid="select-edit-property">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              <PropertySelectItems
                properties={properties || []}
                noneLabel="No property"
              />
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
            Department
          </Label>
          <Select
            value={areaId || "__none__"}
            onValueChange={(v) => {
              setAreaId(v === "__none__" ? "" : v);
              setSubdivisionId("");
            }}
          >
            <SelectTrigger data-testid="select-edit-department">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <NameSelectItems
                items={areas || []}
                noneLabel="Unassigned Department"
              />
            </SelectContent>
          </Select>
        </div>

        {areaId && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Sub-department
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
          <DatePicker
            value={estimatedCompletionDate ? toCalendarDate(estimatedCompletionDate) ?? undefined : undefined}
            onChange={(date) => setEstimatedCompletionDate(date ? format(date, "yyyy-MM-dd") : "")}
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

        {showAssetEditor && (
          <TaskAssetListEditor
            selectedAssets={selectedAssets}
            onAddAsset={handleAddAsset}
            onRemoveAsset={handleRemoveAsset}
            equipment={equipment}
            vehicles={allVehicles}
            showVehicle={showVehicle}
            showEquipment={!!propertyId}
            equipmentDisabled={!propertyId}
          />
        )}

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
