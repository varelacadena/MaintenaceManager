import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Clock,
  User,
  Play,
  CheckCircle2,
  Pause,
  AlertCircle,
  Calendar,
  ArrowRight,
  FileText,
  UserPlus,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, User as UserType, Property, Vendor } from "@shared/schema";
import { format, parseISO, isPast } from "date-fns";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TaskDetailDrawerProps {
  task: Task | null;
  assignee?: UserType | null;
  property?: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  isPending?: boolean;
}

const urgencyConfig = {
  high: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    label: "High Priority",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    label: "Medium Priority",
  },
  low: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    label: "Low Priority",
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  not_started: {
    label: "Not Started",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  needs_estimate: {
    label: "Needs Estimate",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  },
  waiting_approval: {
    label: "Waiting Approval",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  ready: {
    label: "Ready",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  on_hold: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  },
};

export default function TaskDetailDrawer({
  task,
  assignee,
  property,
  isOpen,
  onClose,
  onStatusChange,
  isPending,
}: TaskDetailDrawerProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [reassignOpen, setReassignOpen] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin && reassignOpen,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    enabled: isAdmin && reassignOpen,
  });

  const adminUsers = users.filter((u) => u.role === "admin");
  const technicianUsers = users.filter((u) => u.role === "technician");
  const studentUsers = users.filter((u) => u.role === "student");

  const reassignMutation = useMutation({
    mutationFn: async ({
      taskId,
      assignedToId,
      assignedVendorId,
    }: {
      taskId: string;
      assignedToId: string | null;
      assignedVendorId: string | null;
    }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, {
        assignedToId,
        assignedVendorId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task reassigned",
        description: "The task has been reassigned successfully.",
      });
      setReassignOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reassign task.",
        variant: "destructive",
      });
    },
  });

  if (!task) return null;

  const urgency = urgencyConfig[task.urgency] || urgencyConfig.low;
  const status = statusConfig[task.status] || statusConfig.not_started;

  const isOverdue =
    task.estimatedCompletionDate &&
    isPast(parseISO(task.estimatedCompletionDate as unknown as string)) &&
    task.status !== "completed";

  const getInitials = (user?: UserType | null) => {
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user.username?.[0]?.toUpperCase() || "?";
  };

  const getUserDisplayName = (user: UserType) => {
    if (user.firstName) {
      return `${user.firstName} ${user.lastName || ""}`.trim();
    }
    return user.username;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "MMM d, yyyy");
  };

  const handleReassignToUser = (userId: string) => {
    if (!task) return;
    reassignMutation.mutate({
      taskId: task.id,
      assignedToId: userId,
      assignedVendorId: null,
    });
  };

  const handleReassignToVendor = (vendorId: string) => {
    if (!task) return;
    reassignMutation.mutate({
      taskId: task.id,
      assignedToId: null,
      assignedVendorId: vendorId,
    });
  };

  const handleUnassign = () => {
    if (!task) return;
    reassignMutation.mutate({
      taskId: task.id,
      assignedToId: null,
      assignedVendorId: null,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            {task.urgency === "high" && (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <SheetTitle className="text-left text-lg">{task.name}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", urgency.badge)}>
              {urgency.label}
            </Badge>
            {isOverdue && (
              <Badge variant="outline" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Overdue
              </Badge>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {task.status !== "in_progress" && task.status !== "completed" && (
              <Button
                onClick={() => onStatusChange(task.id, "in_progress")}
                disabled={isPending}
                className="flex-1"
                data-testid="drawer-start-task"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Task
              </Button>
            )}
            {task.status === "in_progress" && (
              <>
                <Button
                  onClick={() => onStatusChange(task.id, "completed")}
                  disabled={isPending}
                  className="flex-1"
                  data-testid="drawer-complete-task"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(task.id, "on_hold")}
                  disabled={isPending}
                  data-testid="drawer-hold-task"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Hold
                </Button>
              </>
            )}
            {task.status === "on_hold" && (
              <Button
                onClick={() => onStatusChange(task.id, "in_progress")}
                disabled={isPending}
                className="flex-1"
                data-testid="drawer-resume-task"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume Task
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{task.description || "No description"}</p>
              </div>
            </div>

            {property && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                  <p className="text-sm">{property.name}</p>
                  {property.address && (
                    <p className="text-xs text-muted-foreground">{property.address}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Assigned To</p>
                  {isAdmin && task.status !== "completed" && (
                    <Popover open={reassignOpen} onOpenChange={setReassignOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid="button-reassign"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Reassign
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 p-0"
                        align="end"
                        side="bottom"
                      >
                        <div className="p-3 border-b">
                          <p className="text-sm font-medium">Reassign Task</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Pick a team member or vendor
                          </p>
                        </div>
                        <ScrollArea className="max-h-64">
                          {(assignee || task.assignedVendorId) && (
                            <div className="p-1 border-b">
                              <button
                                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover-elevate"
                                onClick={handleUnassign}
                                disabled={reassignMutation.isPending}
                                data-testid="button-unassign"
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                                <span>Unassign</span>
                              </button>
                            </div>
                          )}
                          {[
                            { label: "Admins", items: adminUsers },
                            { label: "Technicians", items: technicianUsers },
                            { label: "Students", items: studentUsers },
                          ].filter(group => group.items.length > 0).map((group) => (
                            <div key={group.label} className="p-1">
                              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                {group.label}
                              </p>
                              {group.items.map((u) => (
                                <button
                                  key={u.id}
                                  className={cn(
                                    "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover-elevate",
                                    task.assignedToId === u.id &&
                                      "bg-accent"
                                  )}
                                  onClick={() => handleReassignToUser(u.id)}
                                  disabled={
                                    reassignMutation.isPending ||
                                    task.assignedToId === u.id
                                  }
                                  data-testid={`button-assign-user-${u.id}`}
                                >
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(u)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{getUserDisplayName(u)}</span>
                                  {task.assignedToId === u.id && (
                                    <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-green-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          ))}
                          {vendors.length > 0 && (
                            <div className="p-1 border-t">
                              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                Vendors
                              </p>
                              {vendors.map((v) => (
                                <button
                                  key={v.id}
                                  className={cn(
                                    "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover-elevate",
                                    task.assignedVendorId === v.id &&
                                      "bg-accent"
                                  )}
                                  onClick={() => handleReassignToVendor(v.id)}
                                  disabled={
                                    reassignMutation.isPending ||
                                    task.assignedVendorId === v.id
                                  }
                                  data-testid={`button-assign-vendor-${v.id}`}
                                >
                                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  </div>
                                  <span>{v.name}</span>
                                  {task.assignedVendorId === v.id && (
                                    <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-green-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          {adminUsers.length === 0 && technicianUsers.length === 0 && studentUsers.length === 0 && vendors.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No team members or vendors available
                            </div>
                          )}
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(assignee)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {assignee.firstName
                        ? `${assignee.firstName} ${assignee.lastName || ""}`
                        : assignee.username}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-orange-500">Unassigned</span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm">{formatDate(task.initialDate as unknown as string)}</p>
              </div>
            </div>

            {task.estimatedCompletionDate && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
                  <p
                    className={cn(
                      "text-sm",
                      isOverdue && "text-red-500 font-medium"
                    )}
                  >
                    {formatDate(task.estimatedCompletionDate as unknown as string)}
                    {isOverdue && " (Overdue)"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <Link href={`/tasks/${task.id}`}>
            <Button variant="outline" className="w-full" data-testid="drawer-view-full">
              View Full Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
