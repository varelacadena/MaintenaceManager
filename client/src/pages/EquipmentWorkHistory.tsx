import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Image as ImageIcon, Wrench } from "lucide-react";
import type { Task, Equipment, Upload, User as UserType } from "@shared/schema";
import { Link } from "wouter";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { TaskCard } from "@/components/tasks/TaskCard";
import { FileAttachment } from "@/components/FileAttachment";
import ResourceCard from "@/components/ResourceCard";
import { getUserDisplayName } from "@/utils/taskUtils";
import { apiRequest } from "@/lib/queryClient";
import { toDisplayUrl } from "@/lib/imageUtils";

export default function EquipmentWorkHistory() {
  const { id } = useParams<{ id: string }>();
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);

  const {
    data: equipment,
    isLoading: equipmentLoading,
    isError: isEquipmentError,
  } = useQuery<Equipment>({
    queryKey: ["/api/equipment", id],
    enabled: !!id,
  });

  const {
    data: equipmentTasks = [],
    isLoading: tasksLoading,
    isError: isTasksError,
    error: tasksError,
  } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { equipmentId: id }],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tasks?equipmentId=${encodeURIComponent(id!)}`);
      return res.json();
    },
  });

  const {
    data: equipmentUploads = [],
    isLoading: uploadsLoading,
    isError: isUploadsError,
    error: uploadsError,
  } = useQuery<Upload[]>({
    queryKey: ["/api/equipment", id, "uploads"],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/equipment/${encodeURIComponent(id!)}/uploads`);
      return res.json();
    },
  });

  const {
    data: equipmentResources = [],
    isLoading: resourcesLoading,
    isError: isResourcesError,
    error: resourcesError,
  } = useQuery<any[]>({
    queryKey: ["/api/equipment", id, "resources"],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/equipment/${encodeURIComponent(id!)}/resources`);
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const getAssigneeName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return "Unassigned";
    return getUserDisplayName(user);
  };

  if (equipmentLoading || tasksLoading || uploadsLoading || resourcesLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (isEquipmentError || isTasksError || isUploadsError || isResourcesError) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          {(tasksError as Error)?.message ||
            (uploadsError as Error)?.message ||
            (resourcesError as Error)?.message ||
            "Failed to load equipment work history"}
        </div>
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
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {equipment.assetTag && (
              <span className="text-sm font-mono font-medium text-foreground">{equipment.assetTag}</span>
            )}
            {equipment.category && <Badge variant="secondary" className="capitalize">{equipment.category}</Badge>}
            {equipment.serialNumber && <span className="text-sm">Serial: {equipment.serialNumber}</span>}
            {equipment.condition && <span className="text-sm">Condition: {equipment.condition}</span>}
          </div>
        </div>
        {equipment.propertyId && (
          <Link href={`/properties/${equipment.propertyId}`}>
            <Button variant="outline" size="sm" data-testid="link-property">
              View Property
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Equipment Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(equipment.imageUrl || (equipment as any).manufacturerImageUrl) ? (
              <div className="grid gap-3 md:grid-cols-2">
                {equipment.imageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Equipment Photo</p>
                    <img
                      src={toDisplayUrl(equipment.imageUrl)}
                      alt={`${equipment.name} equipment`}
                      className="w-full max-h-56 object-cover rounded-md border bg-muted"
                    />
                  </div>
                )}
                {(equipment as any).manufacturerImageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Manufacturer Image</p>
                    <img
                      src={toDisplayUrl((equipment as any).manufacturerImageUrl)}
                      alt={`${equipment.name} manufacturer`}
                      className="w-full max-h-56 object-cover rounded-md border bg-muted"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                No images saved for this equipment.
              </div>
            )}
            {equipment.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm mt-1">{equipment.description}</p>
              </div>
            )}
            {equipment.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{equipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Manuals and Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {equipmentUploads.length === 0 ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                No files attached yet.
              </div>
            ) : (
              <div className="space-y-2">
                {equipmentUploads.map((upload) => (
                  <FileAttachment key={upload.id} attachment={upload} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linked Resources ({equipmentResources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {equipmentResources.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No manuals or resources are linked to this equipment yet</p>
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {equipmentResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} variant="list" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({equipmentTasks.length})</CardTitle>
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
                    <TaskCard task={task} getAssigneeName={getAssigneeName} />
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
        onOpenChange={(open) => {
          if (!open) setSummaryTaskId(null);
        }}
      />
    </div>
  );
}
