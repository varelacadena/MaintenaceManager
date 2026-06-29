import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import type { User, Property } from "@shared/schema";
import { exitTo } from "@/lib/navigation";

export default function AdminTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const taskId = params.id || location.split("/tasks/")[1]?.split("?")[0]?.split("/")[0] || "";

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  return (
    <div
      className="h-full flex flex-col -mx-3 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-6 min-h-0"
      data-testid="admin-task-detail-page"
    >
      <TaskDetailPanel
        taskId={taskId}
        isFullscreen={true}
        onClose={() => exitTo(setLocation, "/work")}
        onToggleFullscreen={() => {}}
        allUsers={allUsers}
        properties={properties}
        hideFullscreenToggle
      />
    </div>
  );
}
