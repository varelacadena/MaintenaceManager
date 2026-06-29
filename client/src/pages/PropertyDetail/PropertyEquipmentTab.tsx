import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Paperclip,
  Calendar,
  Search,
  Building2,
  Waves,
  Sparkles,
  HelpCircle,
  Settings,
  QrCode,
} from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";
import { equipmentWorkHistoryPath } from "@/lib/propertyLinks";
import { EQUIPMENT_CATEGORIES, type FormData } from "./usePropertyDetail";
import type { PropertyDetailContext } from "./usePropertyDetail";

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

interface PropertyEquipmentTabProps {
  ctx: PropertyDetailContext;
}

export function PropertyEquipmentTab({ ctx }: PropertyEquipmentTabProps) {
  const {
    equipmentSearch, setEquipmentSearch,
    selectedCategory, setSelectedCategory,
    selectedSpaceId, setSelectedSpaceId,
    setQrEquipment, setIsQrDialogOpen,
    setFileViewerEquipment, setIsEquipmentFilesDialogOpen,
    isBuilding, canEditEquipment,
    equipment, spaces,
    navigate, spaceFilteredEquipment,
    categories, filteredEquipment, groupedEquipment,
    openCreateEquipmentDialog, handleEditEquipment, handleDeleteEquipment,
  } = ctx;
  const selectedSpaceName = selectedSpaceId
    ? spaces.find((space) => space.id === selectedSpaceId)?.name
    : null;
  const emptyMessage = equipmentSearch
    ? "No equipment matches your search"
    : selectedSpaceName
    ? `No equipment assigned to ${selectedSpaceName}`
    : selectedCategory
    ? "No equipment in this category"
    : "No equipment has been added yet";

  return (
    <>
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
            {canEditEquipment && (
              <Button
                size="sm"
                onClick={() => openCreateEquipmentDialog()}
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
                {EQUIPMENT_CATEGORIES.find(c => c.slug === cat.toLowerCase())?.label ?? cat} ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredEquipment.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
            {canEditEquipment && !equipmentSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  openCreateEquipmentDialog({
                    category: (selectedCategory as FormData["category"]) || "general",
                  })
                }
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
              const thumbnailUrl = toDisplayUrl((item as any).imageUrl || (item as any).manufacturerImageUrl);
              const space = item.spaceId ? spaces.find((s) => s.id === item.spaceId) : undefined;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border hover-elevate"
                  data-testid={`card-equipment-${item.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={`${item.name} thumbnail`}
                        className="w-10 h-10 rounded-md object-cover border flex-shrink-0 bg-muted"
                      />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        {item.assetTag && (
                          <span className="text-xs font-mono text-muted-foreground">{item.assetTag}</span>
                        )}
                        <Badge variant="secondary">{EQUIPMENT_CATEGORIES.find(c => c.slug === item.category.toLowerCase())?.label ?? item.category}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {space && <span>{space.name}{space.floor ? ` · ${space.floor}` : ""}</span>}
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
                      onClick={() => {
                        setFileViewerEquipment(item);
                        setIsEquipmentFilesDialogOpen(true);
                      }}
                      title="View pictures and files"
                      data-testid={`button-files-${item.id}`}
                    >
                      <Paperclip className="w-3 h-3 text-primary" />
                    </Button>
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
                      onClick={() => navigate(equipmentWorkHistoryPath(item.id))}
                      data-testid={`button-work-history-${item.id}`}
                    >
                      <Calendar className="w-3 h-3" />
                    </Button>
                    {canEditEquipment && (
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
                          onClick={() => handleDeleteEquipment(item)}
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
    </>
  );
}
