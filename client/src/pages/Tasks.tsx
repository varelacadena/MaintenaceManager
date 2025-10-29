import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, User, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@shared/schema";
import { useLocation } from "wouter";

const urgencyColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const statusConfig = [
  { key: "not_started", label: "Not Started", color: statusColors.not_started },
  { key: "in_progress", label: "In Progress", color: statusColors.in_progress },
  { key: "on_hold", label: "On Hold", color: statusColors.on_hold },
  { key: "completed", label: "Completed", color: statusColors.completed },
];

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useLocation()[1];

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: areas } = useQuery({ queryKey: ["/api/areas"] });
  const { data: users } = useQuery({ queryKey: ["/api/users"] });

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return "General";
    const area = areas?.find((a: any) => a.id === areaId);
    return area?.name || "General";
  };

  const getAssigneeName = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    if (!user) return "Unknown";
    return `${user.firstName} ${user.lastName}`;
  };

  const getAssigneeInitials = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    if (!user) return "?";
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  };

  const groupedTasks = tasks?.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, {} as Record<string, Task[]>) || {};

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {user?.role === "admin" ? "All Tasks" : "My Tasks"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === "admin"
              ? "Manage and monitor all maintenance tasks"
              : "View and manage your assigned tasks"}
          </p>
        </div>
        <Link href="/tasks/new">
          <Button data-testid="button-create-task">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusConfig.map((status) => {
          const tasksInColumn = groupedTasks[status.key] || [];

          return (
            <div key={status.key} className="flex flex-col">
              <div className="mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  {status.label}
                  <Badge variant="secondary" className="rounded-full">
                    {tasksInColumn.length}
                  </Badge>
                </h2>
              </div>

              <div className="space-y-3 flex-1">
                {tasksInColumn.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <Card
                      className="hover-elevate cursor-pointer transition-all"
                      data-testid={`card-task-${task.id}`}
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="space-y-2">
                          <CardTitle className="text-base leading-tight" data-testid={`text-task-name-${task.id}`}>
                            {task.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div className="flex gap-2">
                          <Badge
                            variant="outline"
                            className={urgencyColors[task.urgency]}
                            data-testid={`badge-urgency-${task.id}`}
                          >
                            {task.urgency}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={status.color}
                            data-testid={`badge-status-${task.id}`}
                          >
                            {status.label}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(task.initialDate).toLocaleDateString()}
                            </span>
                          </div>
                          {task.estimatedCompletionDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Due: {new Date(task.estimatedCompletionDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {task.assignedToId && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{getAssigneeName(task.assignedToId)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{task.taskType}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {tasksInColumn.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8">
                      <p className="text-center text-sm text-muted-foreground">
                        No tasks
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}