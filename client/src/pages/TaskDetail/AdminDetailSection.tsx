import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Clock,
  User,
  ExternalLink,
  AlertTriangle,
  Phone,
  ChevronRight,
  History,
  UserPlus,
  Bot,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Link2,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDetailSection({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user,
    timeEntries, users,
    contactStaff,
    allTasks,
    taskDependencies,
    activeTimer,
    isHistorySheetOpen, setIsHistorySheetOpen,
    isAssignDialogOpen, setIsAssignDialogOpen,
    safeNavigate,
    updateStatusMutation, updateTaskMutation,
    isTechnicianOrAdmin, assignedUser,
    estimateBlocksCompletion,
    totalHours, remainingMins,
    aiScheduleLog, aiScheduleLoading,
    handleRunAiSchedule, handleReviewAiSchedule,
  } = ctx;

  if (!task) return null;

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid="time-logged-card">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTimer ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time Logged</p>
            <p className="text-2xl font-bold" data-testid="text-time-logged">{totalHours}h {remainingMins}m</p>
          </div>
        </div>
        {activeTimer && (
          <Badge variant="default" className="animate-pulse">
            Timer Running
          </Badge>
        )}
      </div>

      {isTechnicianOrAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignDialogOpen(true)}
            data-testid="button-assign"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            {assignedUser ? "Reassign" : "Assign"}
          </Button>

          {task.requestId && (
            <Button 
              variant="outline"
              size="sm"
              data-testid="link-original-request"
              onClick={() => safeNavigate(`/requests/${task.requestId}`)}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Request
            </Button>
          )}

        <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-history">
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>Task History</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(70vh-80px)]">
              {timeEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No time entries yet</p>
              ) : (
                timeEntries.map((entry) => {
                  const entryUser = users.find(u => u.id === entry.userId);
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div>
                        <p className="text-sm font-medium">
                          {entryUser?.firstName} {entryUser?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                        </p>
                      </div>
                      {entry.durationMinutes ? (
                        <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                      ) : (
                        <Badge variant="outline" className="animate-pulse">Running</Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>
        </div>
      )}

      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        {(task.contactPhone || contactStaff?.phoneNumber) && (
          <a
            href={`tel:${task.contactPhone || contactStaff?.phoneNumber}`}
            className="flex items-center gap-3 p-3 bg-background rounded-md hover-elevate active-elevate-2"
            data-testid="link-phone"
          >
            <Phone className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="font-medium">{task.contactPhone || contactStaff?.phoneNumber}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>
        )}

        {isTechnicianOrAdmin && (
          <div className="flex items-center gap-3 p-3 bg-background rounded-md">
            <div className="w-5 h-5 flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${
                task.status === "completed" ? "bg-green-500" :
                task.status === "in_progress" ? "bg-blue-500" :
                task.status === "on_hold" ? "bg-yellow-500" : "bg-gray-400"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Select
                value={task.status}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  {!estimateBlocksCompletion && (
                    <SelectItem value="completed">Completed</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isTechnicianOrAdmin && (
          <div className="flex items-center gap-3 p-3 bg-background rounded-md">
            <AlertTriangle className={`w-5 h-5 ${
              task.urgency === "high" ? "text-red-500" :
              task.urgency === "medium" ? "text-yellow-500" : "text-blue-500"
            }`} />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Priority</p>
              <Select
                value={task.urgency}
                onValueChange={(value) => updateTaskMutation.mutate({ urgency: value as "low" | "medium" | "high" })}
                disabled={updateTaskMutation.isPending}
              >
                <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0 capitalize" data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

      </div>

      {user?.role === "admin" && (!task.assignedToId || !task.estimatedCompletionDate) && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Scheduling</span>
              {aiScheduleLog && (
                <Badge variant={aiScheduleLog.status === "approved" ? "default" : aiScheduleLog.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                  {aiScheduleLog.status === "pending_review" ? "Pending Review" : aiScheduleLog.status === "approved" ? "Applied" : "Rejected"}
                </Badge>
              )}
            </div>
            {!aiScheduleLog && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunAiSchedule}
                disabled={aiScheduleLoading}
                data-testid="button-ai-schedule"
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {aiScheduleLoading ? "Analyzing..." : "Suggest Schedule"}
              </Button>
            )}
          </div>
          {aiScheduleLog?.proposedValue && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground italic">{aiScheduleLog.reasoning}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Assignee</span>
                  <p className="font-medium">{aiScheduleLog.proposedValue.suggestedAssigneeName || aiScheduleLog.proposedValue.assigneeName || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Start Date</span>
                  <p className="font-medium">{aiScheduleLog.proposedValue.suggestedStartDate || aiScheduleLog.proposedValue.startDate || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Due Date</span>
                  <p className="font-medium">{aiScheduleLog.proposedValue.suggestedDueDate || aiScheduleLog.proposedValue.dueDate || "—"}</p>
                </div>
              </div>
              {aiScheduleLog.status === "pending_review" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => handleReviewAiSchedule("approved")} className="gap-1.5 text-green-600" data-testid="button-accept-schedule">
                    <ThumbsUp className="h-3.5 w-3.5" /> Apply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReviewAiSchedule("rejected")} className="gap-1.5 text-muted-foreground" data-testid="button-reject-schedule">
                    <ThumbsDown className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {user?.role === "admin" && taskDependencies.length > 0 && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Blocked By</span>
          </div>
          <div className="space-y-1.5">
            {taskDependencies.map((dep: any) => {
              const depTask = allTasks.find((t: any) => t.id === dep.dependsOnTaskId);
              return (
                <div key={dep.id} className="flex items-center gap-2 text-sm">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{depTask?.name || dep.dependsOnTaskId}</span>
                  <Badge variant="outline" className="text-xs capitalize ml-auto">{dep.dependencyType?.replace("_", " ") || "finish to start"}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {task.description && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          <p className="text-sm leading-relaxed" data-testid="text-description">{task.description}</p>
        </div>
      )}
    </>
  );
}
