import { lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Edit,
  Wrench,
  Calendar,
  MapPin,
  DoorOpen,
  ClipboardList,
  Map,
  BookOpen,
} from "lucide-react";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { usePropertyDetail } from "./usePropertyDetail";
import { PropertyDialogs } from "./PropertyDialogs";
import { PropertyResourcesTab } from "./PropertyResourcesTab";
import { PropertyEquipmentTab } from "./PropertyEquipmentTab";
import { PropertyWorkHistoryTab } from "./PropertyWorkHistoryTab";
import { PropertySpacesTab } from "./PropertySpacesTab";

const PropertyMap = lazy(() => import("@/components/PropertyMap"));

export default function PropertyDetail() {
  const ctx = usePropertyDetail();
  const {
    property, isLoading,
    isPropertyError, propertyError, refetchProperty,
    isEquipmentError, refetchEquipment,
    isTasksError, refetchTasks,
    isSpacesError, refetchSpaces,
    equipment, tasks, spaces,
    isBuilding, canEdit, openTaskCount,
    activeTab, setActiveTab,
    summaryTaskId, setSummaryTaskId,
    handleEditProperty,
    id,
  } = ctx;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (isPropertyError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <div className="text-destructive font-medium">Could not load property</div>
        <div className="text-sm text-muted-foreground">
          {(propertyError as Error)?.message || "Please try again."}
        </div>
        <Button variant="outline" onClick={() => refetchProperty()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-muted-foreground">Property not found</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 p-3 md:p-0">
      <div className="flex flex-col gap-1 border-b pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold" data-testid="heading-property-name">{property.name}</h1>
            <Badge variant="secondary">{property.type}</Badge>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditProperty}
              data-testid="button-edit-property"
              className="flex-shrink-0"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {property.address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {property.address}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            Last work: {property.lastWorkDate ? new Date(property.lastWorkDate).toLocaleDateString() : "None"}
          </span>
          <span className="flex items-center gap-1">
            <ClipboardList className="w-3 h-3 flex-shrink-0" />
            {openTaskCount} open {openTaskCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full overflow-x-auto flex-shrink-0">
          {isBuilding && (
            <TabsTrigger value="spaces" data-testid="tab-spaces" className="text-xs md:text-sm">
              <DoorOpen className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="whitespace-nowrap">Spaces ({spaces.length})</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="equipment" data-testid="tab-equipment" className="text-xs md:text-sm">
            <Wrench className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">Equipment ({equipment.length})</span>
          </TabsTrigger>
          <TabsTrigger value="work-history" data-testid="tab-work-history" className="text-xs md:text-sm">
            <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">History ({tasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location" className="text-xs md:text-sm">
            <Map className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">Location</span>
          </TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources" className="text-xs md:text-sm">
            <BookOpen className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">Resources</span>
          </TabsTrigger>
        </TabsList>

        {isBuilding && (
          <TabsContent value="spaces" className="flex flex-col min-h-0 mt-2">
            {isSpacesError ? (
              <TabError message="Could not load spaces" onRetry={() => refetchSpaces()} />
            ) : (
              <PropertySpacesTab ctx={ctx} />
            )}
          </TabsContent>
        )}

        <TabsContent value="equipment" className="flex flex-col min-h-0 mt-2">
          {isEquipmentError ? (
            <TabError message="Could not load equipment" onRetry={() => refetchEquipment()} />
          ) : (
            <PropertyEquipmentTab ctx={ctx} />
          )}
        </TabsContent>

        <TabsContent value="work-history" className="flex flex-col min-h-0 mt-2">
          {isTasksError ? (
            <TabError message="Could not load work history" onRetry={() => refetchTasks()} />
          ) : (
            <PropertyWorkHistoryTab ctx={ctx} />
          )}
        </TabsContent>

        <TabsContent value="location" className="min-h-0 mt-2">
          <Card className="relative z-0 h-full" style={{ minHeight: "400px" }}>
            <CardContent className="p-0 h-full">
              {property.coordinates ? (
                <Suspense fallback={<div className="h-full min-h-[400px] flex items-center justify-center text-sm text-muted-foreground">Loading map...</div>}>
                  <PropertyMap
                    properties={[property]}
                    selectedPropertyId={property.id}
                    editable={false}
                  />
                </Suspense>
              ) : (
                <div className="h-full min-h-[400px] flex items-center justify-center text-center text-muted-foreground p-6">
                  <div>
                    <Map className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No map location set</p>
                    {canEdit && <p className="text-sm mt-1">Use the Properties map to draw this property location.</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="flex flex-col min-h-0 mt-2">
          <PropertyResourcesTab propertyId={id!} propertyName={property.name} />
        </TabsContent>
      </Tabs>

      <CompletedTaskSummary
        taskId={summaryTaskId || ""}
        open={!!summaryTaskId}
        onOpenChange={(open) => { if (!open) setSummaryTaskId(null); }}
      />

      <PropertyDialogs ctx={ctx} />
    </div>
  );
}

function TabError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8 text-destructive">
      <p className="font-medium">{message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
