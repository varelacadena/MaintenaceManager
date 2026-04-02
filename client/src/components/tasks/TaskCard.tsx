import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MapPin } from "lucide-react";
import { statusBadgeStyles, urgencyBadgeStyles, statusLabels } from "@/utils/taskUtils";
import type { Task } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  getAssigneeName?: (userId: string) => string;
  onClick?: () => void;
}

export function TaskCard({ task, getAssigneeName, onClick }: TaskCardProps) {
  return (
    <Card
      className="hover-elevate transition-colors cursor-pointer"
      data-testid={`task-${task.id}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold truncate">{task.name}</h3>
              <Badge variant="outline" className={statusBadgeStyles[task.status]}>
                {statusLabels[task.status] || task.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className={urgencyBadgeStyles[task.urgency]}>
                {task.urgency}
              </Badge>
              {task.isCampusWide && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Campus-Wide
                </Badge>
              )}
              {!task.isCampusWide && task.propertyIds && task.propertyIds.length > 0 && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Multi-Building
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
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
              {task.assignedToId && getAssigneeName && (
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
  );
}
