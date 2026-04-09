import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { EstimateReviewDialog } from "@/components/EstimateReviewDialog";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import type { Property, Area } from "@shared/schema";
import { format, parse } from "date-fns";
import type { UseFormReturn } from "react-hook-form";
import type { UseMutationResult } from "@tanstack/react-query";
import type { EditProjectFormValues, StatusType } from "./useProjectDetail";

interface ProjectDetailDialogsProps {
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  isHoldReasonDialogOpen: boolean;
  setIsHoldReasonDialogOpen: (open: boolean) => void;
  holdReason: string;
  setHoldReason: (reason: string) => void;
  pendingStatusChange: { taskId: string; newStatus: StatusType; task: any } | null;
  setPendingStatusChange: (val: any) => void;
  reviewEstimatesTaskId: string | null;
  setReviewEstimatesTaskId: (id: string | null) => void;
  summaryTaskId: string | null;
  setSummaryTaskId: (id: string | null) => void;
  editForm: UseFormReturn<EditProjectFormValues>;
  updateProjectMutation: UseMutationResult<any, any, EditProjectFormValues, any>;
  deleteProjectMutation: UseMutationResult<any, any, void, any>;
  updateTaskStatusMutation: UseMutationResult<any, any, any, any>;
  handleHoldReasonSubmit: () => void;
  properties?: Property[];
  areas?: Area[];
}

export function ProjectDetailDialogs({
  editDialogOpen, setEditDialogOpen,
  deleteDialogOpen, setDeleteDialogOpen,
  isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
  holdReason, setHoldReason,
  pendingStatusChange, setPendingStatusChange,
  reviewEstimatesTaskId, setReviewEstimatesTaskId,
  summaryTaskId, setSummaryTaskId,
  editForm, updateProjectMutation, deleteProjectMutation, updateTaskStatusMutation,
  handleHoldReasonSubmit,
  properties, areas,
}: ProjectDetailDialogsProps) {
  return (
    <>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateProjectMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-project-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-edit-project-budget" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-property">
                            <SelectValue placeholder="No property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {properties?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-area">
                            <SelectValue placeholder="No area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {areas?.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <DatePicker
                        value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="mm/dd/yyyy"
                        data-testid="input-edit-project-start-date"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="targetEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target End Date</FormLabel>
                      <DatePicker
                        value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="mm/dd/yyyy"
                        data-testid="input-edit-project-end-date"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-project-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending} data-testid="button-save-project">
                  {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteProjectMutation.mutate()}
              disabled={deleteProjectMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHoldReasonDialogOpen} onOpenChange={(open) => {
        setIsHoldReasonDialogOpen(open);
        if (!open) { setHoldReason(""); setPendingStatusChange(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for placing this task on hold. The requester will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            placeholder="Enter reason..."
            className="resize-none"
            rows={3}
            data-testid="textarea-hold-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsHoldReasonDialogOpen(false); setHoldReason(""); setPendingStatusChange(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleHoldReasonSubmit}
              disabled={updateTaskStatusMutation.isPending}
              data-testid="button-confirm-hold"
            >
              {updateTaskStatusMutation.isPending ? "Saving..." : "Place On Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewEstimatesTaskId && (
        <EstimateReviewDialog
          taskId={reviewEstimatesTaskId}
          open={!!reviewEstimatesTaskId}
          onOpenChange={(open) => {
            if (!open) setReviewEstimatesTaskId(null);
          }}
        />
      )}

      {summaryTaskId && (
        <CompletedTaskSummary
          taskId={summaryTaskId}
          open={!!summaryTaskId}
          onOpenChange={(open) => {
            if (!open) setSummaryTaskId(null);
          }}
        />
      )}
    </>
  );
}
