
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MapPin, ExternalLink } from "lucide-react";
import type { Task, Equipment, User as UserType } from "@shared/schema";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const urgencyColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export default function EquipmentWorkHistory() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: equipment, isLoading: equipmentLoading } = useQuery<Equipment>({
    queryKey: ["/api/equipment", id],
    enabled: !!id,
  });

  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Filter tasks that reference this equipment
  const equipmentTasks = allTasks?.filter(task => task.equipmentId === id) || [];

  const getAssigneeName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return "Unassigned";
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
  };

  if (equipmentLoading || tasksLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="p-6">
        <div className="text-center">Equipment not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Work History: {equipment.name}</h1>
          <p className="text-muted-foreground">
            {equipment.category && <span className="capitalize">{equipment.category}</span>}
            {equipment.serialNumber && <span> • Serial: {equipment.serialNumber}</span>}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tasks ({equipmentTasks.length})</span>
            <Link href={`/equipment/${id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Equipment Details
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {equipmentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tasks have been performed on this equipment yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {equipmentTasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer" data-testid={`task-${task.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold truncate">{task.name}</h3>
                            <Badge variant="outline" className={statusColors[task.status]}>
                              {task.status.replace("_", " ")}
                            </Badge>
                            <Badge variant="outline" className={urgencyColors[task.urgency]}>
                              {task.urgency}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Started: {new Date(task.initialDate).toLocaleDateString()}</span>
                            </div>
                            {task.estimatedCompletionDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {new Date(task.estimatedCompletionDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {task.actualCompletionDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Completed: {new Date(task.actualCompletionDate).toLocaleDateString()}</span>
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
                              <span className="capitalize">{task.taskType.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
