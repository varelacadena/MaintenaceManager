import { toDisplayUrl } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { ResourceLibraryContext } from "./useResourceLibrary";
import { ResourceFormBottomSection } from "./ResourceLibraryDialogsExtra";

type ResourceLibraryDialogsProps = Pick<
  ResourceLibraryContext,
  | "toast"
  | "dialogOpen" | "setDialogOpen"
  | "editResource" | "setEditResource"
  | "form" | "setForm"
  | "pasteUrlMode" | "setPasteUrlMode"
  | "isUploading"
  | "showNewCategory" | "setShowNewCategory"
  | "newCategoryName" | "setNewCategoryName"
  | "newCategoryColor" | "setNewCategoryColor"
  | "equipmentSearch" | "setEquipmentSearch"
  | "categories"
  | "allFolders" | "properties" | "allEquipment"
  | "createCategoryMutation" | "createMutation" | "updateMutation" | "deleteMutation"
  | "resetForm" | "handleSubmit"
  | "toggleProperty" | "getUploadParameters" | "handleUploadComplete"
  | "deleteId" | "setDeleteId"
  | "thumbnail"
>;

export function ResourceLibraryDialogs(props: ResourceLibraryDialogsProps) {
  const {
    toast,
    dialogOpen, setDialogOpen,
    editResource, setEditResource,
    form, setForm,
    pasteUrlMode, setPasteUrlMode,
    isUploading,
    showNewCategory, setShowNewCategory,
    newCategoryName, setNewCategoryName,
    newCategoryColor, setNewCategoryColor,
    equipmentSearch, setEquipmentSearch,
    categories,
    allFolders, properties, allEquipment,
    createCategoryMutation, createMutation, updateMutation, deleteMutation,
    resetForm, handleSubmit,
    toggleProperty, getUploadParameters, handleUploadComplete,
    deleteId, setDeleteId,
    thumbnail,
  } = props;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setEditResource(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
            <DialogDescription>
              {editResource
                ? "Update the details for this resource."
                : "Fill in the details below to add a new resource to the library."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Building A Electrical SOP"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                data-testid="input-resource-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this resource..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="resize-none"
                rows={2}
                data-testid="input-resource-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any, url: "", fileName: "" }))}>
                <SelectTrigger data-testid="select-resource-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">YouTube Video</SelectItem>
                  <SelectItem value="document">Document (PDF, DOCX)</SelectItem>
                  <SelectItem value="image">Image (Asset Map, Diagram)</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "video" && (
              <div className="space-y-1.5">
                <Label>YouTube URL <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  data-testid="input-resource-url"
                />
                {thumbnail && (
                  <div className="mt-2 rounded-md overflow-hidden h-32 bg-muted">
                    <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}

            {form.type === "link" && (
              <div className="space-y-1.5">
                <Label>URL <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="https://..."
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  data-testid="input-resource-url"
                />
              </div>
            )}

            {(form.type === "document" || form.type === "image") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{form.type === "document" ? "File" : "Image"} <span className="text-destructive">*</span></Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2"
                    onClick={() => {
                      setPasteUrlMode(v => !v);
                      setForm(f => ({ ...f, url: "", fileName: "" }));
                    }}
                  >
                    {pasteUrlMode ? "Upload a file instead" : "Paste URL instead"}
                  </button>
                </div>

                {pasteUrlMode ? (
                  <div className="space-y-2">
                    <Input
                      placeholder={form.type === "document" ? "https://example.com/file.pdf" : "https://example.com/image.jpg"}
                      value={form.url}
                      onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                      data-testid="input-resource-url"
                    />
                    <Input
                      placeholder={form.type === "document" ? "e.g. Safety_Manual.pdf" : "e.g. Floor_Plan.jpg"}
                      value={form.fileName}
                      onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
                      data-testid="input-resource-filename"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.url ? (
                      <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          {form.type === "image" ? (
                            <img
                              src={toDisplayUrl(form.url)}
                              alt="Preview"
                              className="h-20 w-auto rounded object-contain"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm truncate">{form.fileName || "File uploaded"}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setForm(f => ({ ...f, url: "", fileName: "" }))}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-md p-6 text-center space-y-3">
                        {form.type === "image" ? (
                          <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
                        ) : (
                          <FileText className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {form.type === "document" ? "PDF or DOCX up to 50MB" : "JPG, PNG or GIF up to 20MB"}
                          </p>
                          <ObjectUploader
                            accept={
                              form.type === "document"
                                ? "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                                : "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                            }
                            maxFileSize={form.type === "document" ? 52428800 : 20971520}
                            onGetUploadParameters={getUploadParameters}
                            onComplete={handleUploadComplete}
                            onError={() => toast({ title: "Upload failed", variant: "destructive" })}
                            isLoading={isUploading}
                            buttonVariant="outline"
                            buttonTestId="button-upload-file"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            Choose file
                          </ObjectUploader>
                        </div>
                      </div>
                    )}

                    {form.url && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Display name</Label>
                        <Input
                          placeholder={form.type === "document" ? "e.g. Safety_Manual.pdf" : "e.g. Building_Floor_Plan.jpg"}
                          value={form.fileName}
                          onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
                          data-testid="input-resource-filename"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <ResourceFormBottomSection
              form={form}
              setForm={setForm}
              showNewCategory={showNewCategory}
              setShowNewCategory={setShowNewCategory}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              newCategoryColor={newCategoryColor}
              setNewCategoryColor={setNewCategoryColor}
              equipmentSearch={equipmentSearch}
              setEquipmentSearch={setEquipmentSearch}
              categories={categories}
              allFolders={allFolders}
              properties={properties}
              allEquipment={allEquipment}
              createCategoryMutation={createCategoryMutation}
              toggleProperty={toggleProperty}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDialogOpen(false); setEditResource(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || isUploading}
              data-testid="button-save-resource"
            >
              {editResource ? "Save Changes" : "Add Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resource and remove it from all properties it is linked to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
