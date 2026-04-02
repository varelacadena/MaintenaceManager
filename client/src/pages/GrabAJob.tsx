import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Hand, MapPin, Clock, RefreshCw, Inbox, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { urgencyBadgeStyles, statusBadgeStyles, statusLabels } from "@/utils/taskUtils";
import type { Task } from "@shared/schema";

export default function GrabAJob() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);

  const {
    data: tasks = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Task[]>({
    queryKey: ["/api/tasks/available"],
  });

  const claimMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/claim`);
      return res.json();
    },
    onSuccess: (claimedTask: Task) => {
      setConfirmTask(null);
      toast({
        title: "Job claimed!",
        description: `"${claimedTask.name}" is now assigned to you.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/available/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      navigate(`/tasks/${claimedTask.id}`);
    },
    onError: (error: Error) => {
      setConfirmTask(null);
      if (error.message.includes("already been claimed")) {
        toast({
          title: "Already claimed",
          description: "Someone just grabbed that one — it's been removed from your list.",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/available"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/available/count"] });
      } else {
        toast({
          title: "Failed to claim",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Grab a Job</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Grab a Job</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-available-count">
          {tasks.length} {tasks.length === 1 ? "job" : "jobs"} available in your pool
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="text-empty-title">
            No jobs available
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            There are no unassigned tasks in your pool right now. Check back later or tap refresh to see if new jobs have been posted.
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-empty"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="hover-elevate"
              data-testid={`card-available-task-${task.id}`}
            >
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm leading-snug mb-2" data-testid={`text-task-name-${task.id}`}>
                  {task.name}
                </h3>

                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${urgencyBadgeStyles[task.urgency]}`}>
                    {task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${statusBadgeStyles[task.status]}`}>
                    {statusLabels[task.status] || task.status.replace("_", " ")}
                  </Badge>
                  {task.executorType && (
                    <Badge variant="outline" className="text-xs">
                      {task.executorType === "student" ? "Student" : "Technician"}
                    </Badge>
                  )}
                </div>

                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  {(task as any).propertyName && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{(task as any).propertyName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Submitted {formatDate(task.createdAt)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => setConfirmTask(task)}
                  data-testid={`button-grab-${task.id}`}
                >
                  <Hand className="w-4 h-4 mr-2" />
                  Grab This Job
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!confirmTask} onOpenChange={(open) => !open && setConfirmTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Hand className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Claim this job?</DialogTitle>
                <DialogDescription>This will assign the task to you</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {confirmTask && (
            <div className="rounded-md border p-3">
              <h3 className="font-medium text-sm mb-1" data-testid="text-confirm-task-name">
                {confirmTask.name}
              </h3>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <Badge variant="outline" className={`text-xs ${urgencyBadgeStyles[confirmTask.urgency]}`}>
                  {confirmTask.urgency.charAt(0).toUpperCase() + confirmTask.urgency.slice(1)}
                </Badge>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Once you grab this job, it will be removed from the available pool and assigned to you. You can view it in your task list.
          </p>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmTask(null)}
              disabled={claimMutation.isPending}
              data-testid="button-cancel-grab"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={() => confirmTask && claimMutation.mutate(confirmTask.id)}
              disabled={claimMutation.isPending}
              data-testid="button-confirm-grab"
            >
              {claimMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Hand className="w-4 h-4 mr-2" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
