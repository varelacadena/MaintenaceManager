import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import type { User, Property } from "@shared/schema";
import { useGoBack } from "@/hooks/useGoBack";

export default function AdminTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const [location] = useLocation();
  const back = useGoBack();
  const taskId = params.id || location.split("/tasks/")[1]?.split("?")[0]?.split("/")[0] || "";

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col md:-mx-6 md:-my-6 lg:-mx-8 lg:-my-6"
      data-testid="admin-task-detail-page"
    >
      <TaskDetailPanel
        taskId={taskId}
        isFullscreen={true}
        onClose={back}
        onToggleFullscreen={() => {}}
        allUsers={allUsers}
        properties={properties}
        hideFullscreenToggle
      />
    </div>
  );
}
