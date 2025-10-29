import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UrgencyBadge from "./UrgencyBadge";
import { Calendar, Eye, Wrench, Droplet, Zap, Wind } from "lucide-react";

type UrgencyLevel = "low" | "medium" | "high";
type StatusType = "pending" | "in_progress" | "on_hold" | "completed";

interface TaskCardProps {
  id: string;
  title: string;
  category: string;
  urgency: UrgencyLevel;
  status: StatusType;
  assignedTo?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  dueDate: string;
  onView?: () => void;
}

const categoryIcons: Record<string, any> = {
  "Plumbing": Droplet,
  "Electrical": Zap,
  "HVAC": Wind,
  "Renovation": Wrench,
};

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: { label: "Not Started", className: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  on_hold: { label: "On Hold", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20" },
};

export default function TaskCard({
  id,
  title,
  category,
  urgency,
  status,
  assignedTo,
  dueDate,
  onView,
}: TaskCardProps) {
  const IconComponent = categoryIcons[category] || Wrench;
  const statusStyle = statusConfig[status];

  return (
    <Card className="p-4 hover-elevate" data-testid={`card-task-${id}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted">
          <IconComponent className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium text-sm line-clamp-2" data-testid={`text-task-title-${id}`}>{title}</h3>
            <UrgencyBadge level={urgency} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className={statusStyle.className}>
              {statusStyle.label}
            </Badge>
            <span className="text-xs text-muted-foreground">#{id}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {assignedTo && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={assignedTo.avatar} />
                    <AvatarFallback className="text-xs">{assignedTo.initials}</AvatarFallback>
                  </Avatar>
                  <span>{assignedTo.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{dueDate}</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onView} data-testid={`button-view-${id}`}>
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
