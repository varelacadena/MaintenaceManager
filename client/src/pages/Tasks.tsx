import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, User, MapPin, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Task } from "@shared/schema";

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

export default function Tasks() {
  const { user } = useAuth();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
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

      {!tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No tasks found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-task-${task.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2" data-testid={`text-task-name-${task.id}`}>
                        {task.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline" 
                        className={urgencyColors[task.urgency]}
                        data-testid={`badge-urgency-${task.id}`}
                      >
                        {task.urgency}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={statusColors[task.status]}
                        data-testid={`badge-status-${task.id}`}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(task.initialDate).toLocaleDateString()}
                      </span>
                    </div>
                    {task.estimatedCompletionDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Due: {new Date(task.estimatedCompletionDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {task.assignedToId && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Assigned</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{task.taskType}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
