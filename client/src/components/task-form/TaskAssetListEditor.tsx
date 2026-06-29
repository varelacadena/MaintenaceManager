import { Car, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Equipment, Vehicle } from "@shared/schema";
import type { SelectedAsset } from "./TaskLocationFields";

interface TaskAssetListEditorProps {
  selectedAssets: SelectedAsset[];
  onAddAsset: (asset: SelectedAsset) => void;
  onRemoveAsset: (index: number) => void;
  equipment: Equipment[];
  vehicles: Vehicle[];
  showVehicle: boolean;
  showEquipment?: boolean;
  equipmentDisabled?: boolean;
}

export function TaskAssetListEditor({
  selectedAssets,
  onAddAsset,
  onRemoveAsset,
  equipment,
  vehicles,
  showVehicle,
  showEquipment = true,
  equipmentDisabled = false,
}: TaskAssetListEditorProps) {
  const alreadySelectedEquipmentIds = selectedAssets
    .filter((a) => a.type === "equipment")
    .map((a) => a.id);
  const alreadySelectedVehicleIds = selectedAssets
    .filter((a) => a.type === "vehicle")
    .map((a) => a.id);

  const handleEquipmentSelect = (val: string) => {
    if (val === "__none__") return;
    const item = equipment.find((e) => e.id === val);
    if (item) {
      onAddAsset({ type: "equipment", id: item.id, label: item.name });
    }
  };

  const handleVehicleSelect = (val: string) => {
    if (val === "__none__") return;
    const v = vehicles.find((vehicle) => vehicle.id === val);
    if (v) {
      onAddAsset({
        type: "vehicle",
        id: v.id,
        label: `${v.make} ${v.model} ${v.year} — ${v.vehicleId}`,
      });
    }
  };

  return (
    <div className="space-y-3" data-testid="section-task-assets">
      <Label className="text-xs font-medium text-muted-foreground">
        Equipment / Vehicles ({selectedAssets.length})
      </Label>

      {selectedAssets.length > 0 && (
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
                onClick={() => onRemoveAsset(index)}
                data-testid={`button-remove-asset-${index}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {showEquipment && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Add Equipment</Label>
          <Select onValueChange={handleEquipmentSelect} value="__none__" disabled={equipmentDisabled}>
            <SelectTrigger data-testid="select-add-equipment">
              <SelectValue placeholder={equipmentDisabled ? "Select property first" : "Select equipment to add"} />
            </SelectTrigger>
            <SelectContent>
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
        </div>
      )}

      {showVehicle && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Add Vehicle</Label>
          <Select onValueChange={handleVehicleSelect} value="__none__">
            <SelectTrigger data-testid="select-add-vehicle">
              <SelectValue placeholder="Select vehicle to add" />
            </SelectTrigger>
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
      )}
    </div>
  );
}
