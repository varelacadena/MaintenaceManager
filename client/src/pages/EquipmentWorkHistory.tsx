import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink } from "lucide-react";
import type { Task, Equipment, User as UserType } from "@shared/schema";
import { Link } from "wouter";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { TaskCard } from "@/components/tasks/TaskCard";
import { getUserDisplayName } from "@/utils/taskUtils";

export default function EquipmentWorkHistory() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);

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
    return getUserDisplayName(user);
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
    <div className="p-3 md:p-4 space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Work History: {equipment.name}</h1>
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
              {equipmentTasks.map((task) => {
                if (task.status === "completed") {
                  return (
                    <div key={task.id}>
                      <TaskCard
                        task={task}
                        getAssigneeName={getAssigneeName}
                        onClick={() => setSummaryTaskId(task.id)}
                      />
                    </div>
                  );
                }

                return (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <TaskCard
                      task={task}
                      getAssigneeName={getAssigneeName}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CompletedTaskSummary
        taskId={summaryTaskId || ""}
        open={!!summaryTaskId}
        onOpenChange={(open) => { if (!open) setSummaryTaskId(null); }}
      />
    </div>
  );
}
