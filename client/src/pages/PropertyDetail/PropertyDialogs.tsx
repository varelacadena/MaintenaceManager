import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";
import { ObjectUploader } from "@/components/ObjectUploader";
import { FileAttachment } from "@/components/FileAttachment";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { equipmentKeys } from "@/lib/equipmentQueries";
import { equipmentQrUrl } from "@/lib/propertyLinks";
import { toDisplayUrl } from "@/lib/imageUtils";
import {
  getSignedUploadParameters,
  buildDisplayUrlFromUpload,
  mapUploaderResultToPending,
} from "@/lib/uploadUtils";
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
import { Loader2, Plus, Printer, Trash2, Upload, X, QrCode } from "lucide-react";
import { EQUIPMENT_CATEGORIES, type PropertyDetailContext } from "./usePropertyDetail";
import type { Upload as UploadType } from "@shared/schema";

export function PropertyDialogs({ ctx }: { ctx: PropertyDetailContext }) {
  const [attachmentLabel, setAttachmentLabel] = useState("manual");
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  const {
    id, toast,
    isEditPropertyDialogOpen, setIsEditPropertyDialogOpen,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isSpaceDialogOpen, setIsSpaceDialogOpen,
    isQrDialogOpen, setIsQrDialogOpen,
    fileViewerEquipment,
    isEquipmentFilesDialogOpen, setIsEquipmentFilesDialogOpen,
    editingEquipment, setEditingEquipment,
    editingSpace, setEditingSpace,
    qrEquipment,
    equipmentImageUrl, setEquipmentImageUrl,
    manufacturerImageUrl, setManufacturerImageUrl,
    pendingEquipmentUploads, setPendingEquipmentUploads,
    equipmentImagePathRef,
    manufacturerImagePathRef,
    propertyForm, form, spaceForm,
    onPropertySubmit, onSubmit, onSpaceSubmit,
    updatePropertyMutation, createEquipmentMutation, updateEquipmentMutation,
    createSpaceMutation, updateSpaceMutation,
    isBuilding, spaces, canEdit, handleEditEquipment,
  } = ctx;
  const equipmentIdForUploads = editingEquipment?.id ?? "";
  const { data: equipmentUploads = [], isLoading: isLoadingEquipmentUploads } = useQuery<UploadType[]>({
    queryKey: equipmentKeys.uploads(equipmentIdForUploads),
    enabled: isCreateDialogOpen && !!equipmentIdForUploads,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/equipment/${equipmentIdForUploads}/uploads`);
      return response.json();
    },
  });
  const fileViewerEquipmentId = fileViewerEquipment?.id ?? "";
  const {
    data: fileViewerUploads = [],
    isLoading: isLoadingFileViewerUploads,
    isError: isFileViewerUploadsError,
    error: fileViewerUploadsError,
    refetch: refetchFileViewerUploads,
  } = useQuery<UploadType[]>({
    queryKey: equipmentKeys.uploads(fileViewerEquipmentId),
    enabled: isEquipmentFilesDialogOpen && !!fileViewerEquipmentId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/equipment/${fileViewerEquipmentId}/uploads`);
      return response.json();
    },
  });

  const handleDeleteEquipmentUpload = async (uploadId: string) => {
    try {
      setDeletingUploadId(uploadId);
      await apiRequest("DELETE", `/api/uploads/${uploadId}`);
      await queryClient.invalidateQueries({ queryKey: equipmentKeys.uploads(equipmentIdForUploads) });
      toast({ title: "Attachment removed" });
    } catch (error: any) {
      toast({
        title: "Failed to remove attachment",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingUploadId(null);
    }
  };

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
              {isBuilding && (
                <FormField
                  control={form.control}
                  name="spaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Space (Optional)</FormLabel>
                      {spaces.length > 0 ? (
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value === "__none__" ? undefined : value);
                          }}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-equipment-space">
                              <SelectValue placeholder="Property-wide (no specific space)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Property-wide (no specific space)</SelectItem>
                            {spaces.map((space) => (
                              <SelectItem key={space.id} value={space.id}>
                                {space.name}{space.floor ? ` (${space.floor})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                          <span className="text-sm text-muted-foreground">No spaces defined yet.</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsCreateDialogOpen(false);
                              setEditingEquipment(null);
                              setIsSpaceDialogOpen(true);
                            }}
                            data-testid="button-add-space-from-equipment"
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
                <FormLabel>Equipment Picture (Optional)</FormLabel>
                <p className="text-xs text-muted-foreground">Main photo used in equipment profile cards and detail views.</p>
                {equipmentImageUrl ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={toDisplayUrl(equipmentImageUrl)}
                      alt="Equipment"
                      className="w-24 h-24 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEquipmentImageUrl("")}
                      data-testid="button-remove-equipment-image"
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
                      const params = await getSignedUploadParameters();
                      equipmentImagePathRef.current = params.objectPath || "";
                      return params;
                    }}
                    onComplete={(result: any) => {
                      const file = result.successful?.[0];
                      if (file) {
                        const objectPath = equipmentImagePathRef.current || file.objectPath;
                        setEquipmentImageUrl(
                          buildDisplayUrlFromUpload(objectPath, file.url || file.objectUrl || file.uploadURL)
                        );
                      }
                    }}
                    onError={() => toast({ title: "Upload failed", variant: "destructive" })}
                    buttonVariant="outline"
                    buttonTestId="button-upload-equipment-image"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload equipment photo
                  </ObjectUploader>
                )}
              </div>

              <div className="space-y-2">
                <FormLabel>Manufacturer Image (Optional)</FormLabel>
                <p className="text-xs text-muted-foreground">Upload a label, manual cover, or product photo. Displayed when scanning this equipment.</p>
                {manufacturerImageUrl ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={toDisplayUrl(manufacturerImageUrl)}
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
                      const params = await getSignedUploadParameters();
                      manufacturerImagePathRef.current = params.objectPath || "";
                      return params;
                    }}
                    onComplete={(result: any) => {
                      const file = result.successful?.[0];
                      if (file) {
                        const objectPath = manufacturerImagePathRef.current || file.objectPath;
                        setManufacturerImageUrl(
                          buildDisplayUrlFromUpload(objectPath, file.url || file.objectUrl || file.uploadURL)
                        );
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

              <div className="space-y-2">
                <FormLabel>Manuals, Plates, and Other Files (Optional)</FormLabel>
                <p className="text-xs text-muted-foreground">Upload PDFs/images and link them to this equipment when you save.</p>
                <div className="flex items-center gap-2">
                  <Select value={attachmentLabel} onValueChange={setAttachmentLabel}>
                    <SelectTrigger className="w-56" data-testid="select-equipment-upload-label">
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="manufacturer-plate">Manufacturer Plate</SelectItem>
                      <SelectItem value="other-photo">Other Photo</SelectItem>
                      <SelectItem value="other-file">Other File</SelectItem>
                    </SelectContent>
                  </Select>
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={15728640}
                    accept=".pdf,.doc,.docx,image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                    onGetUploadParameters={getSignedUploadParameters}
                    onComplete={(result: any) => {
                      const added = (result.successful || []).map((file: any) =>
                        mapUploaderResultToPending(file, attachmentLabel)
                      );
                      if (added.length > 0) {
                        setPendingEquipmentUploads((prev) => [...prev, ...added]);
                        toast({ title: "Files uploaded", description: `${added.length} file(s) ready to attach` });
                      }
                    }}
                    onError={() => toast({ title: "Upload failed", variant: "destructive" })}
                    buttonVariant="outline"
                    buttonTestId="button-upload-equipment-attachments"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Add files
                  </ObjectUploader>
                </div>
                {pendingEquipmentUploads.length > 0 && (
                  <div className="space-y-2 rounded-md border p-2">
                    {pendingEquipmentUploads.map((upload, index) => (
                      <div key={`${upload.fileName}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate">{upload.fileName}</div>
                          <Badge variant="secondary" className="mt-1 capitalize">{(upload.label || "other-file").replace("-", " ")}</Badge>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setPendingEquipmentUploads((prev) => prev.filter((_, i) => i !== index))}
                          data-testid={`button-remove-equipment-upload-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {editingEquipment && (
                <div className="space-y-2">
                  <FormLabel>Existing Equipment Files</FormLabel>
                  <p className="text-xs text-muted-foreground">Current manuals, manufacturer plates, and reference files for this equipment.</p>
                  {isLoadingEquipmentUploads ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading attachments...
                    </div>
                  ) : equipmentUploads.length === 0 ? (
                    <div className="text-xs text-muted-foreground rounded-md border p-2">No saved files yet.</div>
                  ) : (
                    <div className="space-y-2 rounded-md border p-2">
                      {equipmentUploads.map((upload) => (
                        <div key={upload.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <FileAttachment attachment={upload} />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={deletingUploadId === upload.id}
                            onClick={() => handleDeleteEquipmentUpload(upload.id)}
                            data-testid={`button-delete-existing-equipment-upload-${upload.id}`}
                            title="Remove attachment"
                          >
                            {deletingUploadId === upload.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEquipment(null);
                    setEquipmentImageUrl("");
                    setManufacturerImageUrl("");
                    equipmentImagePathRef.current = "";
                    manufacturerImagePathRef.current = "";
                    setPendingEquipmentUploads([]);
                    form.reset({
                      propertyId: id || "", name: "", category: "general",
                      description: "", serialNumber: "", condition: "", notes: "", imageUrl: "",
                      manufacturerImageUrl: "", spaceId: undefined,
                    });
                  }}
                  data-testid="button-cancel-equipment"
                >Cancel</Button>
                <Button type="submit" disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending} data-testid="button-submit-equipment">
                  {updateEquipmentMutation.isPending
                    ? "Updating..."
                    : createEquipmentMutation.isPending
                    ? "Adding..."
                    : editingEquipment
                    ? "Update Equipment"
                    : "Add Equipment"}
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
                    value={equipmentQrUrl(window.location.origin, qrEquipment.id)}
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

      <Dialog open={isEquipmentFilesDialogOpen} onOpenChange={setIsEquipmentFilesDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipment Pictures and Files</DialogTitle>
            <DialogDescription>
              {fileViewerEquipment?.name || "Equipment"} attachments and images.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(fileViewerEquipment as any)?.imageUrl || (fileViewerEquipment as any)?.manufacturerImageUrl ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(fileViewerEquipment as any)?.imageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Equipment Photo</p>
                    <img
                      src={toDisplayUrl((fileViewerEquipment as any).imageUrl)}
                      alt="Equipment"
                      className="w-full max-h-44 object-cover rounded-md border"
                    />
                  </div>
                )}
                {(fileViewerEquipment as any)?.manufacturerImageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Manufacturer Image</p>
                    <img
                      src={toDisplayUrl((fileViewerEquipment as any).manufacturerImageUrl)}
                      alt="Manufacturer"
                      className="w-full max-h-44 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground rounded-md border p-2">No images saved for this equipment.</div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Attached Files</p>
              {isLoadingFileViewerUploads ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading files...
                </div>
              ) : isFileViewerUploadsError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Could not load attached files</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(fileViewerUploadsError as Error)?.message || "Please try again."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => refetchFileViewerUploads()}
                  >
                    Retry
                  </Button>
                </div>
              ) : fileViewerUploads.length === 0 ? (
                <div className="text-xs text-muted-foreground rounded-md border p-2">No files attached yet.</div>
              ) : (
                <div className="space-y-2">
                  {fileViewerUploads.map((upload) => (
                    <FileAttachment key={upload.id} attachment={upload} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            {canEdit && fileViewerEquipment && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsEquipmentFilesDialogOpen(false);
                  handleEditEquipment(fileViewerEquipment);
                }}
                data-testid="button-edit-equipment-files"
              >
                Add or Manage Files
              </Button>
            )}
            <Button variant="ghost" onClick={() => setIsEquipmentFilesDialogOpen(false)} data-testid="button-close-equipment-files">
              Close
            </Button>
          </DialogFooter>
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
