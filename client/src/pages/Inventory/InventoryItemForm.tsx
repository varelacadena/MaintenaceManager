import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormDescription,
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
import { ScanLine } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import {
  CATEGORIES,
  TRACKING_MODES,
  CATEGORY_TRACKING_DEFAULTS,
} from "./inventoryConstants";
import { inventoryFormSchema, type InventoryFormValues } from "./inventoryFormSchema";

interface InventoryItemFormProps {
  form: UseFormReturn<InventoryFormValues>;
  watchTracking: string | undefined;
  idPrefix?: string;
  isScanBarcodeOpen: boolean;
  setIsScanBarcodeOpen: (open: boolean) => void;
  showCost?: boolean;
}

export function InventoryItemForm({
  form,
  watchTracking,
  idPrefix = "",
  isScanBarcodeOpen,
  setIsScanBarcodeOpen,
  showCost = true,
}: InventoryItemFormProps) {
  const testId = (base: string) => {
    if (!idPrefix) return base;
    if (base.startsWith("input-")) return base.replace("input-", `input-${idPrefix}`);
    if (base.startsWith("select-")) return base.replace("select-", `select-${idPrefix}`);
    if (base.startsWith("button-")) return base.replace("button-", `button-${idPrefix}`);
    return `${idPrefix}${base}`;
  };

  return (
    <div className="space-y-4">
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Item Name</FormLabel>
          <FormControl>
            <Input {...field} placeholder="e.g. Cleaning Spray, Motor Oil" data-testid={testId("input-name")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select
              value={field.value || "general"}
              onValueChange={(val) => {
                field.onChange(val);
                form.setValue(
                  "trackingMode",
                  (CATEGORY_TRACKING_DEFAULTS[val] || "counted") as InventoryFormValues["trackingMode"]
                );
              }}
            >
              <FormControl>
                <SelectTrigger data-testid={testId("select-category")}><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="trackingMode" render={({ field }) => (
          <FormItem>
            <FormLabel>Tracking</FormLabel>
            <Select value={field.value || "counted"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger data-testid={testId("select-tracking-mode")}><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {TRACKING_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {watchTracking && (
              <FormDescription className="text-xs">
                {TRACKING_MODES.find((m) => m.value === watchTracking)?.description}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {watchTracking !== "status" && (
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem>
              <FormLabel>{watchTracking === "container" ? "On Hand" : "Quantity"}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid={testId("input-quantity")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <FormField control={form.control} name="unit" render={({ field }) => (
          <FormItem>
            <FormLabel>Unit</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ""}
                placeholder={watchTracking === "container" ? "bottles, bags" : "pcs, gallons, ft"}
                data-testid={testId("input-unit")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      {watchTracking === "status" && (
        <FormField control={form.control} name="stockStatus" render={({ field }) => (
          <FormItem>
            <FormLabel>Current Status</FormLabel>
            <Select value={field.value || "stocked"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger data-testid={testId("select-stock-status")}><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="stocked">Stocked</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="out">Out</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      )}
      <FormField control={form.control} name="packageInfo" render={({ field }) => (
        <FormItem>
          <FormLabel>Package Info (Optional)</FormLabel>
          <FormControl>
            <Input {...field} value={field.value || ""} placeholder="e.g. 32 oz bottle" data-testid={testId("input-package-info")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Location (Optional)</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ""} placeholder="Storage Room A" data-testid={testId("input-location")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {showCost && (
          <FormField control={form.control} name="cost" render={({ field }) => (
            <FormItem>
              <FormLabel>Cost / Unit (Optional)</FormLabel>
              <FormControl>
                <Input {...field} type="number" step="0.01" min="0" value={field.value || ""} placeholder="5.99" data-testid={testId("input-cost")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>
      {watchTracking !== "status" && (
        <FormField control={form.control} name="minQuantity" render={({ field }) => (
          <FormItem>
            <FormLabel>Low Stock Alert Threshold (Optional)</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? 0}
                type="number"
                step="0.01"
                min="0"
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                data-testid={testId("input-min-quantity")}
              />
            </FormControl>
            <FormDescription className="text-xs">Alert when stock falls to or below this level</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      )}
      <FormField control={form.control} name="barcode" render={({ field }) => (
        <FormItem>
          <FormLabel>Barcode / QR Code (Optional)</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input {...field} value={field.value || ""} placeholder="Scan or enter barcode" data-testid={testId("input-barcode")} />
            </FormControl>
            <Button type="button" variant="outline" size="icon" onClick={() => setIsScanBarcodeOpen(true)} data-testid={testId("button-scan-barcode-field")}>
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
          <BarcodeScanner
            open={isScanBarcodeOpen}
            onOpenChange={setIsScanBarcodeOpen}
            onScan={(val) => { field.onChange(val); setIsScanBarcodeOpen(false); }}
            title="Scan Item Barcode"
            description="Scan the barcode on this item"
          />
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>Notes (Optional)</FormLabel>
          <FormControl>
            <Textarea {...field} value={field.value || ""} placeholder="Additional details" data-testid={testId("input-description")} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}
