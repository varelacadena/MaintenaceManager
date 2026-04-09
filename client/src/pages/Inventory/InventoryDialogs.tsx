import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ScanLine, RefreshCw } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import {
  CATEGORIES,
  TRACKING_MODES,
  CATEGORY_TRACKING_DEFAULTS,
} from "./useInventory";
import type { InventoryContext } from "./useInventory";

interface InventoryDialogsProps {
  ctx: InventoryContext;
}

export function InventoryDialogs({ ctx }: InventoryDialogsProps) {
  const {
    isScanFindOpen, setIsScanFindOpen,
    isScanReceiveOpen, setIsScanReceiveOpen,
    isScanCreateBarcodeOpen, setIsScanCreateBarcodeOpen,
    isAiDialogOpen, setIsAiDialogOpen,
    isQrDialogOpen, setIsQrDialogOpen,
    isCreateDialogOpen, setIsCreateDialogOpen,
    selectedItem,
    aiReorderData, aiSummary, isAiLoading,
    qrCodeDataUrl,
    createMutation,
    createForm,
    watchCreateTracking,
    handleCreateSubmit,
    handleScanFind, handleScanReceive,
    handleLoadAiInsights, handlePrintLabel,
  } = ctx;

  return (
    <>
      <BarcodeScanner open={isScanFindOpen} onOpenChange={setIsScanFindOpen} onScan={handleScanFind}
        title="Find Item" description="Scan a barcode or QR code to locate it" />
      <BarcodeScanner open={isScanReceiveOpen} onOpenChange={setIsScanReceiveOpen} onScan={handleScanReceive}
        title="Receive Stock" description="Scan a barcode to restock an item" />

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent data-testid="dialog-ai-insights">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Inventory Insights
            </DialogTitle>
            <DialogDescription>AI-powered analysis of your inventory usage and reorder needs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Analyzing inventory...</p>
              </div>
            ) : (
              <>
                {aiSummary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Usage Trends</p>
                    <p className="text-sm leading-relaxed">{aiSummary}</p>
                  </div>
                )}
                {aiReorderData && aiReorderData.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reorder Recommendations</p>
                    <div className="space-y-2">
                      {aiReorderData.map((rec: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded-md border text-sm" data-testid={`ai-reorder-${i}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{rec.name}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">{rec.reason}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={rec.urgency === "high" ? "destructive" : rec.urgency === "medium" ? "outline" : "secondary"} className="text-xs">
                              {rec.urgency}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">Order {rec.suggestedReorderQuantity} {rec.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiReorderData && aiReorderData.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">All items are well-stocked. No reorders needed.</p>
                )}
                {!aiReorderData && !aiSummary && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleLoadAiInsights} disabled={isAiLoading} data-testid="button-refresh-ai-insights">
              <RefreshCw className={`h-4 w-4 mr-2 ${isAiLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsAiDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>Scan to look up this item</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="rounded-md border p-2" width={200} height={200} />
            ) : (
              <div className="h-48 w-48 flex items-center justify-center text-muted-foreground border rounded-md text-sm">Generating...</div>
            )}
            <div className="text-center space-y-1">
              {selectedItem?.packageInfo && <p className="text-xs text-muted-foreground">{selectedItem.packageInfo}</p>}
              {selectedItem?.location && <p className="text-xs text-muted-foreground">Location: {selectedItem.location}</p>}
              <p className="text-xs text-muted-foreground font-mono">{selectedItem?.barcode || selectedItem?.id}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>Close</Button>
            <Button onClick={handlePrintLabel} data-testid="button-print-label">Print Label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-inventory">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to inventory</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField control={createForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Cleaning Spray, Motor Oil" data-testid="input-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value || "general"} onValueChange={(val) => {
                      field.onChange(val);
                      createForm.setValue("trackingMode", CATEGORY_TRACKING_DEFAULTS[val] || "counted");
                    }}>
                      <FormControl><SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="trackingMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking</FormLabel>
                    <Select value={field.value || "counted"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-tracking-mode"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TRACKING_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchCreateTracking && (
                      <FormDescription className="text-xs">
                        {TRACKING_MODES.find((m) => m.value === watchCreateTracking)?.description}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {watchCreateTracking !== "status" && (
                  <FormField control={createForm.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCreateTracking === "container" ? "On Hand" : "Quantity"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={createForm.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""}
                        placeholder={watchCreateTracking === "container" ? "bottles, bags" : "pcs, gallons, ft"}
                        data-testid="input-unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {watchCreateTracking === "status" && (
                <FormField control={createForm.control} name="stockStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Status</FormLabel>
                    <Select value={field.value || "stocked"} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-stock-status"><SelectValue /></SelectTrigger></FormControl>
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
              <FormField control={createForm.control} name="packageInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Info (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g. 32 oz bottle, 12-pack case" data-testid="input-package-info" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={createForm.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} placeholder="Storage Room A" data-testid="input-location" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost / Unit (Optional)</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" min="0" value={field.value || ""} placeholder="5.99" data-testid="input-cost" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {watchCreateTracking !== "status" && (
                <FormField control={createForm.control} name="minQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Alert Threshold (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? 0} type="number" step="0.01" min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-min-quantity" />
                    </FormControl>
                    <FormDescription className="text-xs">Alert when stock falls to or below this level</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={createForm.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode / QR Code (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Scan or enter barcode" data-testid="input-barcode" />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsScanCreateBarcodeOpen(true)} data-testid="button-scan-barcode-field">
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                  <BarcodeScanner open={isScanCreateBarcodeOpen} onOpenChange={setIsScanCreateBarcodeOpen}
                    onScan={(val) => { field.onChange(val); setIsScanCreateBarcodeOpen(false); }}
                    title="Scan Item Barcode" description="Scan the barcode on this item" />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={createForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ""} placeholder="Additional details" data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
