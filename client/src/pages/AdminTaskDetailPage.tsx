import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import type { User, Property } from "@shared/schema";

export default function AdminTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const taskId = params.id || "";

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  return (
    <div className="h-full flex flex-col" data-testid="admin-task-detail-page">
      <TaskDetailPanel
        taskId={taskId}
        isFullscreen={true}
        onClose={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            setLocation("/work");
          }
        }}
        onToggleFullscreen={() => {}}
        allUsers={allUsers}
        properties={properties}
        hideFullscreenToggle
      />
    </div>
  );
}
