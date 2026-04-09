import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Layers } from "lucide-react";
import type { NewTaskContext } from "./useNewTask";

interface NewTaskSubtaskSectionProps {
  ctx: NewTaskContext;
}

export function NewTaskSubtaskSection({ ctx }: NewTaskSubtaskSectionProps) {
  const { pendingSubTasks, setPendingSubTasks, equipment, allVehicles } = ctx;

  return (
    <section className="border-b border-border/50 pb-8 space-y-4" data-testid="section-subtasks">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Sub-tasks</h2>
          <Badge variant="secondary" className="text-xs">Optional</Badge>
          {pendingSubTasks.length > 0 && (
            <Badge variant="default" className="text-xs">{pendingSubTasks.length}</Badge>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPendingSubTasks(prev => [...prev, { name: "", description: "", equipmentId: "", vehicleId: "" }]);
          }}
          data-testid="button-add-subtask"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Sub-Task
        </Button>
      </div>
      {pendingSubTasks.length === 0 ? (
        <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
          <p className="text-sm text-muted-foreground">No sub-tasks added. Break down complex tasks into smaller steps.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingSubTasks.map((subTask, index) => {
            const hasEmptyName = subTask.name.length > 0 && !subTask.name.trim();
            return (
            <div key={index} className="p-3 border rounded-md space-y-2" data-testid={`subtask-item-${index}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div>
                    <Input
                      placeholder="Sub-task name *"
                      value={subTask.name}
                      onChange={(e) => {
                        setPendingSubTasks(prev => prev.map((st, i) =>
                          i === index ? { ...st, name: e.target.value } : st
                        ));
                      }}
                      className={hasEmptyName ? "border-destructive" : ""}
                      data-testid={`input-subtask-name-${index}`}
                    />
                    {hasEmptyName && (
                      <p className="text-xs text-destructive mt-1">Sub-task name cannot be blank</p>
                    )}
                  </div>
                  <Textarea
                    placeholder="Description (optional)"
                    className="min-h-[60px] resize-none"
                    value={subTask.description}
                    onChange={(e) => {
                      setPendingSubTasks(prev => prev.map((st, i) =>
                        i === index ? { ...st, description: e.target.value } : st
                      ));
                    }}
                    data-testid={`textarea-subtask-description-${index}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Equipment (optional)</Label>
                      <Select
                        value={subTask.equipmentId || "none"}
                        onValueChange={(value) => {
                          setPendingSubTasks(prev => prev.map((st, i) =>
                            i === index ? { ...st, equipmentId: value === "none" ? "" : value, vehicleId: value !== "none" ? "" : st.vehicleId } : st
                          ));
                        }}
                      >
                        <SelectTrigger data-testid={`select-subtask-equipment-${index}`}>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {equipment.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Vehicle (optional)</Label>
                      <Select
                        value={subTask.vehicleId || "none"}
                        onValueChange={(value) => {
                          setPendingSubTasks(prev => prev.map((st, i) =>
                            i === index ? { ...st, vehicleId: value === "none" ? "" : value, equipmentId: value !== "none" ? "" : st.equipmentId } : st
                          ));
                        }}
                      >
                        <SelectTrigger data-testid={`select-subtask-vehicle-${index}`}>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allVehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.make} {v.model} {v.vehicleId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPendingSubTasks(prev => prev.filter((_, i) => i !== index));
                  }}
                  data-testid={`button-remove-subtask-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
