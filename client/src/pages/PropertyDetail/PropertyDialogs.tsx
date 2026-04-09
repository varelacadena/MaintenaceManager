import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "react-qr-code";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/form";
import { Printer, Upload, X, QrCode } from "lucide-react";
import { EQUIPMENT_CATEGORIES, type PropertyDetailContext } from "./usePropertyDetail";

export function PropertyDialogs({ ctx }: { ctx: PropertyDetailContext }) {
  const {
    id, toast,
    isEditPropertyDialogOpen, setIsEditPropertyDialogOpen,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isSpaceDialogOpen, setIsSpaceDialogOpen,
    isQrDialogOpen, setIsQrDialogOpen,
    editingEquipment, setEditingEquipment,
    editingSpace, setEditingSpace,
    qrEquipment,
    manufacturerImageUrl, setManufacturerImageUrl,
    uploadObjectPathRef,
    propertyForm, form, spaceForm,
    onPropertySubmit, onSubmit, onSpaceSubmit,
    updatePropertyMutation, createEquipmentMutation, updateEquipmentMutation,
    createSpaceMutation, updateSpaceMutation,
  } = ctx;

  return (
    <>
      <Dialog open={isEditPropertyDialogOpen} onOpenChange={setIsEditPropertyDialogOpen}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>Update property information</DialogDescription>
          </DialogHeader>
          <Form {...propertyForm}>
            <form onSubmit={propertyForm.handleSubmit(onPropertySubmit)} className="space-y-4">
              <FormField
                control={propertyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Building A" data-testid="input-property-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={propertyForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-property-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="building">Building</SelectItem>
                        <SelectItem value="lawn">Lawn</SelectItem>
                        <SelectItem value="parking">Parking</SelectItem>
                        <SelectItem value="recreation">Recreation</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="road">Road</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={propertyForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="123 Main St" data-testid="input-property-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsEditPropertyDialogOpen(false); propertyForm.reset(); }} data-testid="button-cancel-property">Cancel</Button>
                <Button type="submit" disabled={updatePropertyMutation.isPending} data-testid="button-submit-property">
                  {updatePropertyMutation.isPending ? "Updating..." : "Update Property"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
            <DialogDescription>
              {editingEquipment ? "Update equipment information" : "Add new equipment to this property"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HVAC Unit #1" data-testid="input-equipment-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EQUIPMENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Detailed description of the equipment" data-testid="input-equipment-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="SN-12345" data-testid="input-serial-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Good, Fair, Poor" data-testid="input-condition" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Additional notes" data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Manufacturer Image (Optional)</FormLabel>
                <p className="text-xs text-muted-foreground">Upload a label, manual cover, or product photo. Displayed when scanning this equipment.</p>
                {manufacturerImageUrl ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={manufacturerImageUrl}
                      alt="Manufacturer"
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManufacturerImageUrl("")}
                      data-testid="button-remove-manufacturer-image"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                    maxFileSize={10485760}
                    onGetUploadParameters={async () => {
                      const res = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
                      const data = await res.json();
                      uploadObjectPathRef.current = data.objectPath || "";
                      return { method: "PUT" as const, url: data.uploadURL };
                    }}
                    onComplete={(result: any) => {
                      const file = result.successful?.[0];
                      if (file) {
                        const objectPath = uploadObjectPathRef.current;
                        const displayUrl = objectPath
                          ? `/api/objects/image?path=${encodeURIComponent(objectPath)}`
                          : (file.url || file.objectUrl || file.uploadURL);
                        setManufacturerImageUrl(displayUrl);
                      }
                    }}
                    onError={() => toast({ title: "Upload failed", variant: "destructive" })}
                    buttonVariant="outline"
                    buttonTestId="button-upload-manufacturer-image"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload image
                  </ObjectUploader>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEquipment(null);
                    setManufacturerImageUrl("");
                    form.reset({
                      propertyId: id || "", name: "", category: "general",
                      description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                      manufacturerImageUrl: "",
                    });
                  }}
                  data-testid="button-cancel-equipment"
                >Cancel</Button>
                <Button type="submit" disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending} data-testid="button-submit-equipment">
                  {editingEquipment ? "Update Equipment" : "Add Equipment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Equipment QR Code
            </DialogTitle>
            <DialogDescription>
              {qrEquipment?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrEquipment && (
              <>
                <div className="bg-white p-4 rounded-md border" id="qr-print-area">
                  <QRCode
                    value={`${window.location.origin}/equipment/${qrEquipment.id}`}
                    size={200}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium text-black">{qrEquipment.name}</p>
                    {qrEquipment.serialNumber && (
                      <p className="text-xs text-gray-500">SN: {qrEquipment.serialNumber}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground px-2">
                  Scan to view equipment info, work history, and linked manuals.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const printContent = document.getElementById("qr-print-area");
                      if (printContent) {
                        const w = window.open("", "_blank");
                        if (w) {
                          w.document.write(`<html><head><title>${qrEquipment.name} QR</title><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif;}@media print{body{margin:0;}}</style></head><body>${printContent.outerHTML}</body></html>`);
                          w.document.close();
                          w.focus();
                          w.print();
                          w.close();
                        }
                      }
                    }}
                    data-testid="button-print-qr"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Print Label
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQrDialogOpen(false)}
                    data-testid="button-close-qr"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSpaceDialogOpen} onOpenChange={(open) => {
        setIsSpaceDialogOpen(open);
        if (!open) {
          setEditingSpace(null);
          spaceForm.reset({ propertyId: id || "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpace ? "Edit Space" : "Add Space"}</DialogTitle>
            <DialogDescription>Add offices, classrooms, grounds, or other spaces within this property.</DialogDescription>
          </DialogHeader>
          <Form {...spaceForm}>
            <form onSubmit={spaceForm.handleSubmit(onSpaceSubmit)} className="space-y-4">
              <FormField
                control={spaceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Office, Grounds, Classroom 101" {...field} data-testid="input-space-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={spaceForm.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1st Floor, Basement, 2nd Floor" {...field} value={field.value || ""} data-testid="input-space-floor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={spaceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description of this space" {...field} value={field.value || ""} data-testid="input-space-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsSpaceDialogOpen(false); setEditingSpace(null); spaceForm.reset({ propertyId: id || "" }); }} data-testid="button-cancel-space">Cancel</Button>
                <Button type="submit" disabled={createSpaceMutation.isPending || updateSpaceMutation.isPending} data-testid="button-submit-space">
                  {editingSpace ? "Update" : "Add Space"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
