import { Plus, X, Car, Wrench } from "lucide-react";
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
}

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
}: TaskLocationFieldsProps) {
  const alreadySelectedEquipmentIds = selectedAssets
    .filter((a) => a.type === "equipment")
    .map((a) => a.id);
  const alreadySelectedVehicleIds = selectedAssets
    .filter((a) => a.type === "vehicle")
    .map((a) => a.id);

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

  return (
    <div className="space-y-4">
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
    </div>
  );
}
