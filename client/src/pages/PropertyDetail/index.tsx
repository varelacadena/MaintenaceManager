import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Wrench,
  Wind,
  Zap,
  Droplets,
  Trees,
  FileText,
  Calendar,
  MapPin,
  DoorOpen,
  Search,
  ChevronRight,
  ClipboardList,
  Map,
  Building2,
  Waves,
  Sparkles,
  HelpCircle,
  Settings,
  QrCode,
  BookOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryStyle } from "@/lib/categoryColors";
import { Link } from "wouter";
import PropertyMap from "@/components/PropertyMap";
import { TaskCard } from "@/components/tasks/TaskCard";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { usePropertyDetail, EQUIPMENT_CATEGORIES, type FormData } from "./usePropertyDetail";
import { PropertyDialogs } from "./PropertyDialogs";
import { PropertyResourcesTab } from "./PropertyResourcesTab";

const categoryIcons: Record<string, any> = {
  hvac: Wind,
  electrical: Zap,
  plumbing: Droplets,
  mechanical: Settings,
  appliances: Wrench,
  grounds: Trees,
  janitorial: Sparkles,
  structural: Building2,
  water_treatment: Waves,
  general: HelpCircle,
  electric: Zap,
  structure: Building2,
  landscaping: Trees,
  diagrams: FileText,
  other: HelpCircle,
};

export default function PropertyDetail() {
  const ctx = usePropertyDetail();
  const {
    id, toast,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isEditPropertyDialogOpen, setIsEditPropertyDialogOpen,
    isSpaceDialogOpen, setIsSpaceDialogOpen,
    editingEquipment, setEditingEquipment,
    editingSpace, setEditingSpace,
    selectedCategory, setSelectedCategory,
    selectedSpaceId, setSelectedSpaceId,
    equipmentSearch, setEquipmentSearch,
    spaceSearch, setSpaceSearch,
    taskSearch, setTaskSearch,
    summaryTaskId, setSummaryTaskId,
    qrEquipment, setQrEquipment,
    isQrDialogOpen, setIsQrDialogOpen,
    manufacturerImageUrl, setManufacturerImageUrl,
    uploadObjectPathRef,
    property, isLoading,
    equipment, tasks, spaces,
    isBuilding, canEdit, openTaskCount,
    form, propertyForm, spaceForm,
    createSpaceMutation, updateSpaceMutation,
    createEquipmentMutation, updateEquipmentMutation,
    updatePropertyMutation,
    onSubmit, onPropertySubmit, onSpaceSubmit,
    handleEditSpace, handleDeleteSpace, handleEditProperty,
    handleEditEquipment, handleDeleteEquipment,
    navigate, spaceFilteredEquipment, categoryFilteredEquipment,
    categories, filteredEquipment, groupedEquipment, filteredSpaces, filteredTasks,
    getAssigneeName,
  } = ctx;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading property...</div>
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

      <Tabs defaultValue={isBuilding ? "spaces" : "equipment"} className="flex-1 flex flex-col min-h-0">
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
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search spaces..."
                  value={spaceSearch}
                  onChange={(e) => setSpaceSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-spaces"
                />
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingSpace(null);
                    spaceForm.reset({ propertyId: id || "", name: "", description: "", floor: "" });
                    setIsSpaceDialogOpen(true);
                  }}
                  data-testid="button-add-space"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Space
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredSpaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DoorOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{spaceSearch ? "No spaces match your search" : "No spaces defined yet"}</p>
                  {canEdit && !spaceSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSpace(null);
                        spaceForm.reset({ propertyId: id || "" });
                        setIsSpaceDialogOpen(true);
                      }}
                      data-testid="button-add-first-space"
                    >
                      Add your first space
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSpaces.map((space) => {
                    const spaceEquipCount = equipment.filter(e => e.spaceId === space.id).length;
                    return (
                      <div
                        key={space.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                        onClick={() => {
                          setSelectedSpaceId(space.id);
                        }}
                        data-testid={`card-space-${space.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <DoorOpen className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{space.name}</span>
                              {space.floor && <Badge variant="outline">{space.floor}</Badge>}
                            </div>
                            {space.description && (
                              <p className="text-xs text-muted-foreground truncate">{space.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{spaceEquipCount} items</span>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleEditSpace(space); }}
                                data-testid={`button-edit-space-${space.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSpace(space.id); }}
                                data-testid={`button-delete-space-${space.id}`}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="equipment" className="flex flex-col min-h-0 mt-2">
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-equipment"
                />
              </div>
              <div className="flex items-center gap-2">
                {isBuilding && spaces.length > 0 && (
                  <Select value={selectedSpaceId || "__all__"} onValueChange={(v) => setSelectedSpaceId(v === "__all__" ? null : v)}>
                    <SelectTrigger className="w-28 md:w-36" data-testid="select-space-filter">
                      <SelectValue placeholder="All spaces" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All spaces</SelectItem>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>{space.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingEquipment(null);
                      setManufacturerImageUrl("");
                      form.reset({
                        propertyId: id || "", name: "", category: "general",
                        description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                        manufacturerImageUrl: "",
                      });
                      setIsCreateDialogOpen(true);
                    }}
                    data-testid="button-add-equipment"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 flex-wrap">
              <Badge
                variant={selectedCategory === null ? "default" : "secondary"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory(null)}
                data-testid="filter-all"
              >
                All ({spaceFilteredEquipment.length})
              </Badge>
              {categories.map((cat) => {
                const count = groupedEquipment[cat]?.length || 0;
                if (count === 0) return null;
                const Icon = categoryIcons[cat] || categoryIcons[cat.toLowerCase()] || HelpCircle;
                return (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "secondary"}
                    className="cursor-pointer whitespace-nowrap gap-1"
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    data-testid={`filter-${cat}`}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredEquipment.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{equipmentSearch ? "No equipment matches your search" : "No equipment in this category"}</p>
                {canEdit && !equipmentSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingEquipment(null);
                      form.reset({
                        propertyId: id || "", name: "",
                        category: (selectedCategory as FormData["category"]) || "general",
                        description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                      });
                      setIsCreateDialogOpen(true);
                    }}
                    data-testid="button-add-first-equipment"
                  >
                    Add your first equipment
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEquipment.map((item) => {
                  const Icon = categoryIcons[item.category] || categoryIcons[item.category.toLowerCase()] || HelpCircle;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate"
                      data-testid={`card-equipment-${item.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{item.name}</span>
                            <Badge variant="secondary">{EQUIPMENT_CATEGORIES.find(c => c.slug === item.category.toLowerCase())?.label ?? item.category}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {item.serialNumber && <span>SN: {item.serialNumber}</span>}
                            {item.condition && <span>Condition: {item.condition}</span>}
                            {item.description && <span className="truncate">{item.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setQrEquipment(item); setIsQrDialogOpen(true); }}
                          title="Show QR Code"
                          data-testid={`button-qr-${item.id}`}
                        >
                          <QrCode className="w-3 h-3 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/equipment/${item.id}/work-history`)}
                          data-testid={`button-work-history-${item.id}`}
                        >
                          <Calendar className="w-3 h-3" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditEquipment(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteEquipment(item.id)}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="work-history" className="flex flex-col min-h-0 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-tasks"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{taskSearch ? "No tasks match your search" : "No tasks assigned to this property yet"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
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
          </div>
        </TabsContent>

        <TabsContent value="location" className="min-h-0 mt-2">
          <Card className="relative z-0 h-full" style={{ minHeight: "400px" }}>
            <CardContent className="p-0 h-full">
              <PropertyMap
                properties={[property]}
                selectedPropertyId={property.id}
                editable={false}
              />
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
