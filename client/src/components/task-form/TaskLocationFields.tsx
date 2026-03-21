import { useState, useRef, useEffect } from "react";
import { Plus, X, Car, Wrench, Building2, Globe, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { Property, Space, Equipment, Vehicle } from "@shared/schema";

export type SelectedAsset = {
  type: "equipment" | "vehicle";
  id: string;
  label: string;
};

interface TaskLocationFieldsProps {
  form: any;
  properties: Property[];
  spaces: Space[];
  equipment: Equipment[];
  vehicles?: Vehicle[];
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  selectedSpaceId: string;
  setSelectedSpaceId: (id: string) => void;
  isBuilding: boolean;
  selectedProperty: Property | undefined;
  onAddSpace: () => void;
  onAddEquipment?: () => void;
  showEquipmentCreate?: boolean;
  selectedAssets?: SelectedAsset[];
  onAddAsset?: (asset: SelectedAsset) => void;
  onRemoveAsset?: (index: number) => void;
  multiAssetMode?: boolean;
  locationScope: "single" | "multiple" | "campus";
  onLocationScopeChange: (scope: "single" | "multiple" | "campus") => void;
  selectedPropertyIds: string[];
  onSelectedPropertyIdsChange: (ids: string[]) => void;
}

const MAX_VISIBLE_TAGS = 3;

export function TaskLocationFields({
  form,
  properties,
  spaces,
  equipment,
  vehicles = [],
  selectedPropertyId,
  setSelectedPropertyId,
  selectedSpaceId,
  setSelectedSpaceId,
  isBuilding,
  selectedProperty,
  onAddSpace,
  onAddEquipment,
  showEquipmentCreate,
  selectedAssets = [],
  onAddAsset,
  onRemoveAsset,
  multiAssetMode = false,
  locationScope,
  onLocationScopeChange,
  selectedPropertyIds,
  onSelectedPropertyIdsChange,
}: TaskLocationFieldsProps) {
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState("");

  const alreadySelectedEquipmentIds = selectedAssets
    .filter((a) => a.type === "equipment")
    .map((a) => a.id);
  const alreadySelectedVehicleIds = selectedAssets
    .filter((a) => a.type === "vehicle")
    .map((a) => a.id);

  const buildings = properties.filter((p) => p.type === "building");
  const filteredBuildings = buildingSearch.trim()
    ? buildings.filter((b) =>
        b.name.toLowerCase().includes(buildingSearch.toLowerCase())
      )
    : buildings;

  const handleScopeChange = (scope: "single" | "multiple" | "campus") => {
    onLocationScopeChange(scope);
    if (scope === "campus") {
      form.setValue("isCampusWide", true);
      form.setValue("propertyIds", []);
      form.setValue("propertyId", undefined);
      form.setValue("spaceId", undefined);
      form.setValue("equipmentId", undefined);
      setSelectedPropertyId("");
      setSelectedSpaceId("");
      onSelectedPropertyIdsChange([]);
    } else if (scope === "multiple") {
      form.setValue("isCampusWide", false);
      form.setValue("propertyId", undefined);
      form.setValue("spaceId", undefined);
      form.setValue("equipmentId", undefined);
      setSelectedPropertyId("");
      setSelectedSpaceId("");
    } else {
      form.setValue("isCampusWide", false);
      form.setValue("propertyIds", []);
      onSelectedPropertyIdsChange([]);
    }
  };

  const toggleBuilding = (id: string) => {
    const next = selectedPropertyIds.includes(id)
      ? selectedPropertyIds.filter((pid) => pid !== id)
      : [...selectedPropertyIds, id];
    onSelectedPropertyIdsChange(next);
    form.setValue("propertyIds", next);
  };

  const removeBuilding = (id: string) => {
    const next = selectedPropertyIds.filter((pid) => pid !== id);
    onSelectedPropertyIdsChange(next);
    form.setValue("propertyIds", next);
  };

  const handleEquipmentSelect = (val: string) => {
    if (showEquipmentCreate && val === "create_new" && onAddEquipment) {
      onAddEquipment();
      return;
    }
    if (val === "__none__") {
      if (!multiAssetMode) {
        form.setValue("equipmentId", undefined);
      }
      return;
    }
    if (multiAssetMode && onAddAsset) {
      const item = equipment.find((e) => e.id === val);
      if (item) {
        onAddAsset({ type: "equipment", id: item.id, label: item.name });
      }
    } else {
      form.setValue("equipmentId", val);
    }
  };

  const handleVehicleSelect = (val: string) => {
    if (val === "__none__") {
      if (!multiAssetMode) {
        form.setValue("vehicleId", undefined);
      }
      return;
    }
    if (multiAssetMode && onAddAsset) {
      const v = vehicles.find((v) => v.id === val);
      if (v) {
        onAddAsset({
          type: "vehicle",
          id: v.id,
          label: `${v.make} ${v.model} ${v.year} — ${v.vehicleId}`,
        });
      }
    } else {
      form.setValue("vehicleId", val);
    }
  };

  const visibleTags = selectedPropertyIds.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = selectedPropertyIds.length - MAX_VISIBLE_TAGS;

  return (
    <div className="space-y-4">
      <div>
        <FormLabel>Location Scope</FormLabel>
        <div className="flex gap-1.5 mt-1.5 flex-wrap" data-testid="location-scope-selector">
          <Button
            type="button"
            variant={locationScope === "single" ? "default" : "outline"}
            onClick={() => handleScopeChange("single")}
            data-testid="button-scope-single"
          >
            <Building2 className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Single Building</span>
            <span className="sm:hidden">Single</span>
          </Button>
          <Button
            type="button"
            variant={locationScope === "multiple" ? "default" : "outline"}
            onClick={() => handleScopeChange("multiple")}
            data-testid="button-scope-multiple"
          >
            <Building2 className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Multiple Buildings</span>
            <span className="sm:hidden">Multiple</span>
          </Button>
          <Button
            type="button"
            variant={locationScope === "campus" ? "default" : "outline"}
            onClick={() => handleScopeChange("campus")}
            data-testid="button-scope-campus"
          >
            <Globe className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">All Campus</span>
            <span className="sm:hidden">All</span>
          </Button>
        </div>
      </div>

      {locationScope === "campus" && (
        <div
          className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20"
          data-testid="campus-wide-indicator"
        >
          <Globe className="w-5 h-5 text-primary shrink-0" />
          <span className="text-sm font-medium">
            This task applies to all campus buildings
          </span>
        </div>
      )}

      {locationScope === "multiple" && (
        <div className="space-y-2">
          <FormLabel>Select Buildings *</FormLabel>
          <Popover open={multiSelectOpen} onOpenChange={setMultiSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
                data-testid="button-multi-building-select"
              >
                <span className="text-muted-foreground truncate">
                  {selectedPropertyIds.length === 0
                    ? "Select buildings..."
                    : `${selectedPropertyIds.length} building${selectedPropertyIds.length > 1 ? "s" : ""} selected`}
                </span>
                <Building2 className="w-4 h-4 shrink-0 ml-2 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search buildings..."
                    value={buildingSearch}
                    onChange={(e) => setBuildingSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    data-testid="input-building-search"
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto p-1">
                {filteredBuildings.length === 0 ? (
                  <div className="text-center py-3 text-sm text-muted-foreground">
                    No buildings found
                  </div>
                ) : (
                  filteredBuildings.map((building) => {
                    const isSelected = selectedPropertyIds.includes(building.id);
                    return (
                      <div
                        key={building.id}
                        className="flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-md cursor-pointer hover-elevate"
                        onClick={() => toggleBuilding(building.id)}
                        data-testid={`checkbox-building-${building.id}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          className="shrink-0"
                        />
                        <span className="text-sm truncate flex-1">
                          {building.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {buildings.length > 5 && (
                <div className="border-t p-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {selectedPropertyIds.length} of {buildings.length} selected
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedPropertyIds.length === buildings.length) {
                        onSelectedPropertyIdsChange([]);
                        form.setValue("propertyIds", []);
                      } else {
                        const allIds = buildings.map((b) => b.id);
                        onSelectedPropertyIdsChange(allIds);
                        form.setValue("propertyIds", allIds);
                      }
                    }}
                    data-testid="button-toggle-all-buildings"
                  >
                    {selectedPropertyIds.length === buildings.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {selectedPropertyIds.length === 0 && form.formState.isSubmitted && (
            <p className="text-sm text-destructive" data-testid="error-no-buildings">
              Please select at least one building
            </p>
          )}

          {selectedPropertyIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-testid="selected-buildings-tags">
              {visibleTags.map((pid) => {
                const p = properties.find((pr) => pr.id === pid);
                return (
                  <Badge
                    key={pid}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`badge-building-${pid}`}
                  >
                    <span className="max-w-[150px] truncate text-xs">
                      {p?.name || pid}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-0.5 no-default-hover-elevate no-default-active-elevate"
                      onClick={() => removeBuilding(pid)}
                      data-testid={`button-remove-building-${pid}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
              {hiddenCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{hiddenCount} more
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {locationScope === "single" && (
        <>
          <FormField
            control={form.control}
            name="propertyId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Property *</FormLabel>
                <Select
                  onValueChange={(value: string) => {
                    field.onChange(value);
                    setSelectedPropertyId(value);
                    setSelectedSpaceId("");
                    form.setValue("spaceId", undefined);
                    form.setValue("equipmentId", undefined);
                  }}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-property">
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                        <span className="text-muted-foreground ml-1">({property.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {isBuilding && (
            <FormField
              control={form.control}
              name="spaceId"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Space (Optional)</FormLabel>
                  {spaces.length > 0 ? (
                    <Select
                      onValueChange={(value: string) => {
                        const actualValue = value === "__none__" ? undefined : value;
                        field.onChange(actualValue);
                        setSelectedSpaceId(actualValue || "");
                        form.setValue("equipmentId", undefined);
                      }}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-space">
                          <SelectValue placeholder="Select space (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">All Spaces</SelectItem>
                        {spaces.map((space) => (
                          <SelectItem key={space.id} value={space.id}>
                            {space.name}{space.floor ? ` (${space.floor})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30" data-testid="text-no-spaces">
                      <span className="text-sm text-muted-foreground">No spaces defined yet.</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddSpace}
                        data-testid="button-add-space-inline"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Space
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {multiAssetMode && selectedAssets.length > 0 && (
            <div className="space-y-2" data-testid="section-selected-assets">
              <FormLabel>Selected Assets ({selectedAssets.length})</FormLabel>
              <div className="flex flex-wrap gap-2">
                {selectedAssets.map((asset, index) => (
                  <Badge
                    key={`${asset.type}-${asset.id}`}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`badge-asset-${asset.type}-${asset.id}`}
                  >
                    {asset.type === "vehicle" ? (
                      <Car className="w-3 h-3" />
                    ) : (
                      <Wrench className="w-3 h-3" />
                    )}
                    <span className="max-w-[200px] truncate">{asset.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 no-default-hover-elevate no-default-active-elevate"
                      onClick={() => onRemoveAsset?.(index)}
                      data-testid={`button-remove-asset-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {multiAssetMode ? (
            <div className="space-y-3">
              <FormLabel>Add Equipment</FormLabel>
              <Select
                onValueChange={handleEquipmentSelect}
                value="__none__"
                disabled={!selectedPropertyId}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-equipment">
                    <SelectValue placeholder={selectedPropertyId ? "Select equipment to add" : "Select property first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {showEquipmentCreate && (
                    <SelectItem value="create_new" className="font-medium text-primary">
                      <Plus className="w-3 h-3 inline mr-1" />
                      Add New Equipment
                    </SelectItem>
                  )}
                  <SelectItem value="__none__">None</SelectItem>
                  {equipment
                    .filter((item) => !alreadySelectedEquipmentIds.includes(item.id))
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <FormLabel>Add Vehicle</FormLabel>
              <Select
                onValueChange={handleVehicleSelect}
                value="__none__"
              >
                <FormControl>
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Select vehicle to add" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {vehicles
                    .filter((v) => !alreadySelectedVehicleIds.includes(v.id))
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.make} {v.model} {v.year} — {v.vehicleId}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <Select
                      onValueChange={(val: string) => {
                        if (showEquipmentCreate && val === "create_new" && onAddEquipment) {
                          onAddEquipment();
                        } else {
                          field.onChange(val === "__none__" ? undefined : val);
                        }
                      }}
                      value={field.value || "__none__"}
                      disabled={!selectedPropertyId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment">
                          <SelectValue placeholder={selectedPropertyId ? "Select equipment (optional)" : "Select property first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {showEquipmentCreate && (
                          <SelectItem value="create_new" className="font-medium text-primary">
                            <Plus className="w-3 h-3 inline mr-1" />
                            Add New Equipment
                          </SelectItem>
                        )}
                        <SelectItem value="__none__">None</SelectItem>
                        {equipment.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select
                      onValueChange={(val: string) => {
                        field.onChange(val === "__none__" ? undefined : val);
                      }}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-vehicle">
                          <SelectValue placeholder="Select vehicle (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.make} {v.model} {v.year} — {v.vehicleId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {!multiAssetMode && onAddAsset && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const equipmentId = form.getValues("equipmentId");
                const vehicleId = form.getValues("vehicleId");
                if (equipmentId) {
                  const item = equipment.find((e) => e.id === equipmentId);
                  if (item) {
                    onAddAsset({ type: "equipment", id: item.id, label: item.name });
                    form.setValue("equipmentId", undefined);
                  }
                }
                if (vehicleId) {
                  const v = vehicles.find((v) => v.id === vehicleId);
                  if (v) {
                    onAddAsset({
                      type: "vehicle",
                      id: v.id,
                      label: `${v.make} ${v.model} ${v.year} — ${v.vehicleId}`,
                    });
                    form.setValue("vehicleId", undefined);
                  }
                }
              }}
              data-testid="button-add-another-asset"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Another Equipment/Vehicle
            </Button>
          )}
        </>
      )}
    </div>
  );
}
