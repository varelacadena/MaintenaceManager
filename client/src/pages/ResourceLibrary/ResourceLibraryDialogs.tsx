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
  Plus,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Folder,
} from "lucide-react";
import { getCategoryStyle, CATEGORY_COLORS } from "@/lib/categoryColors";
import { ObjectUploader } from "@/components/ObjectUploader";
import { EQUIPMENT_CATEGORIES_RESOURCE } from "./useResourceLibrary";
import type { ResourceLibraryContext } from "./useResourceLibrary";

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
  | "createFolderMutation" | "updateFolderMutation" | "deleteFolderMutation"
  | "resetForm" | "handleSubmit"
  | "toggleProperty" | "getUploadParameters" | "handleUploadComplete"
  | "handleFolderSubmit"
  | "deleteId" | "setDeleteId"
  | "folderDialogOpen" | "setFolderDialogOpen"
  | "folderName" | "setFolderName"
  | "editingFolder" | "setEditingFolder"
  | "deleteFolderId" | "setDeleteFolderId"
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
    createFolderMutation, updateFolderMutation, deleteFolderMutation,
    resetForm, handleSubmit,
    toggleProperty, getUploadParameters, handleUploadComplete,
    handleFolderSubmit,
    deleteId, setDeleteId,
    folderDialogOpen, setFolderDialogOpen,
    folderName, setFolderName,
    editingFolder, setEditingFolder,
    deleteFolderId, setDeleteFolderId,
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

            <div className="space-y-1.5">
              <Label>Folder</Label>
              <Select value={form.folderId || "none"} onValueChange={v => setForm(f => ({ ...f, folderId: v === "none" ? "" : v }))}>
                <SelectTrigger data-testid="select-resource-folder">
                  <SelectValue placeholder="No folder (root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder (root)</SelectItem>
                  {allFolders.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                        {f.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              {!showNewCategory ? (
                <div className="flex gap-2">
                  <Select value={form.categoryId || "none"} onValueChange={v => setForm(f => ({ ...f, categoryId: v === "none" ? "" : v }))}>
                    <SelectTrigger className="flex-1" data-testid="select-resource-category">
                      <SelectValue placeholder="Select a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map(cat => {
                        const style = getCategoryStyle(cat.color);
                        return (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: style.background }} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCategory(true)} data-testid="button-new-category">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">New Category</p>
                  <Input
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    data-testid="input-new-category-name"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map(c => {
                        const s = getCategoryStyle(c.value);
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewCategoryColor(c.value)}
                            className={`px-2 py-1 rounded text-xs font-medium border-2 transition-all ${newCategoryColor === c.value ? "border-foreground" : "border-transparent"}`}
                            style={s}
                            data-testid={`button-color-${c.value}`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => createCategoryMutation.mutate({ name: newCategoryName, color: newCategoryColor })}
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      data-testid="button-save-category"
                    >
                      Save Category
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCategory(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Link to Equipment (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Resources linked here appear automatically when that equipment is scanned on the job.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Specific Equipment Unit</Label>
                <div className="relative">
                  <Input
                    placeholder="Search equipment by name..."
                    value={equipmentSearch}
                    onChange={e => {
                      setEquipmentSearch(e.target.value);
                      if (!e.target.value) setForm(f => ({ ...f, equipmentId: "" }));
                    }}
                    data-testid="input-equipment-search"
                  />
                  {equipmentSearch && !form.equipmentId && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-44 overflow-y-auto">
                      <div
                        className="px-3 py-2 cursor-pointer hover-elevate text-sm text-muted-foreground"
                        onClick={() => { setEquipmentSearch(""); setForm(f => ({ ...f, equipmentId: "" })); }}
                      >
                        None / Clear
                      </div>
                      {allEquipment
                        .filter(e => e.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
                        .slice(0, 20)
                        .map(e => {
                          const prop = properties.find(p => p.id === e.propertyId);
                          return (
                            <div
                              key={e.id}
                              className="px-3 py-2 cursor-pointer hover-elevate text-sm"
                              onClick={() => {
                                setForm(f => ({ ...f, equipmentId: e.id }));
                                setEquipmentSearch(e.name);
                              }}
                              data-testid={`equipment-option-${e.id}`}
                            >
                              <span className="font-medium">{e.name}</span>
                              {prop && <span className="text-muted-foreground ml-1">— {prop.name}</span>}
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {form.equipmentId && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => { setEquipmentSearch(""); setForm(f => ({ ...f, equipmentId: "" })); }}
                    >
                      x
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Equipment Category (all units of this type)</Label>
                <Select value={form.equipmentCategory || "none"} onValueChange={v => setForm(f => ({ ...f, equipmentCategory: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-equipment-category-link">
                    <SelectValue placeholder="None / Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Any category</SelectItem>
                    {EQUIPMENT_CATEGORIES_RESOURCE.map(cat => (
                      <SelectItem key={cat.slug} value={cat.slug}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Link to Properties</Label>
              <p className="text-xs text-muted-foreground">This resource will appear in the Resources tab of selected properties and in all their associated tasks.</p>
              {properties.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No properties found</p>
              ) : (
                <div className="max-h-44 overflow-y-auto border rounded-md divide-y">
                  {properties.map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate" data-testid={`checkbox-property-${p.id}`}>
                      <input
                        type="checkbox"
                        checked={form.propertyIds.includes(p.id)}
                        onChange={() => toggleProperty(p.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
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

      <Dialog open={folderDialogOpen} onOpenChange={open => { setFolderDialogOpen(open); if (!open) { setEditingFolder(null); setFolderName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingFolder ? "Rename Folder" : "New Folder"}</DialogTitle>
            <DialogDescription>
              {editingFolder ? "Enter a new name for this folder." : "Enter a name for the new folder."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Folder Name</Label>
              <Input
                placeholder="e.g. HVAC Manuals"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleFolderSubmit(); }}
                autoFocus
                data-testid="input-folder-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setFolderDialogOpen(false); setEditingFolder(null); setFolderName(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleFolderSubmit}
              disabled={!folderName.trim() || createFolderMutation.isPending || updateFolderMutation.isPending}
              data-testid="button-save-folder"
            >
              {editingFolder ? "Rename" : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFolderId} onOpenChange={open => { if (!open) setDeleteFolderId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this folder and all subfolders inside it. Resources in this folder will be moved to the root level.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFolderId && deleteFolderMutation.mutate(deleteFolderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-folder"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
