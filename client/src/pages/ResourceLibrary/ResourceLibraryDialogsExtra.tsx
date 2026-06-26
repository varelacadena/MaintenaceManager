import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Folder } from "lucide-react";
import { getCategoryStyle, CATEGORY_COLORS } from "@/lib/categoryColors";
import { EQUIPMENT_CATEGORIES } from "@shared/equipmentCategories";
import type { ResourceLibraryContext } from "./useResourceLibrary";
import { buildFolderPathLabel } from "./resourceUtils";
import { sortByName } from "@/lib/propertyDisplayUtils";
import { PropertySelectLabel } from "@/components/PropertySelectItems";

type ResourceFormBottomSectionProps = Pick<
  ResourceLibraryContext,
  | "form" | "setForm"
  | "showNewCategory" | "setShowNewCategory"
  | "newCategoryName" | "setNewCategoryName"
  | "newCategoryColor" | "setNewCategoryColor"
  | "equipmentSearch" | "setEquipmentSearch"
  | "categories"
  | "allFolders" | "properties" | "allEquipment"
  | "createCategoryMutation"
  | "toggleProperty"
>;

export function ResourceFormBottomSection(props: ResourceFormBottomSectionProps) {
  const {
    form, setForm,
    showNewCategory, setShowNewCategory,
    newCategoryName, setNewCategoryName,
    newCategoryColor, setNewCategoryColor,
    equipmentSearch, setEquipmentSearch,
    categories,
    allFolders, properties, allEquipment,
    createCategoryMutation,
    toggleProperty,
  } = props;

  const equipmentListId = useId();
  const equipmentContainerRef = useRef<HTMLDivElement>(null);
  const [equipmentListOpen, setEquipmentListOpen] = useState(false);
  const [equipmentHighlight, setEquipmentHighlight] = useState(0);

  const equipmentMatches = equipmentSearch && !form.equipmentId
    ? allEquipment
      .filter((item) => item.name.toLowerCase().includes(equipmentSearch.toLowerCase()))
      .slice(0, 20)
    : [];

  useEffect(() => {
    setEquipmentHighlight(0);
  }, [equipmentSearch]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!equipmentContainerRef.current?.contains(event.target as Node)) {
        setEquipmentListOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectEquipment(item: { id: string; name: string; propertyId: string }) {
    setForm((current) => ({
      ...current,
      equipmentId: item.id,
      propertyIds: current.propertyIds.includes(item.propertyId)
        ? current.propertyIds
        : [...current.propertyIds, item.propertyId],
    }));
    setEquipmentSearch(item.name);
    setEquipmentListOpen(false);
  }

  function handleEquipmentKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!equipmentListOpen || equipmentMatches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setEquipmentHighlight((index) => (index + 1) % equipmentMatches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setEquipmentHighlight((index) => (index - 1 + equipmentMatches.length) % equipmentMatches.length);
    } else if (event.key === "Enter" && equipmentMatches[equipmentHighlight]) {
      event.preventDefault();
      selectEquipment(equipmentMatches[equipmentHighlight]);
    } else if (event.key === "Escape") {
      setEquipmentListOpen(false);
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label>Folder</Label>
        <Select value={form.folderId || "none"} onValueChange={v => setForm(f => ({ ...f, folderId: v === "none" ? "" : v }))}>
          <SelectTrigger data-testid="select-resource-folder">
            <SelectValue placeholder="No folder (root)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No folder (root)</SelectItem>
            {allFolders.map(folder => (
              <SelectItem key={folder.id} value={folder.id}>
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                  {buildFolderPathLabel(folder, allFolders)}
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowNewCategory(true)}
              aria-label="Create category"
              data-testid="button-new-category"
            >
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Resources linked here appear automatically when that equipment is scanned on the job.
            Selecting equipment also adds its property link.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="input-equipment-search">Specific Equipment Unit</Label>
          <div className="relative" ref={equipmentContainerRef}>
            <Input
              id="input-equipment-search"
              placeholder="Search equipment by name..."
              value={equipmentSearch}
              role="combobox"
              aria-expanded={equipmentListOpen}
              aria-controls={equipmentListId}
              aria-autocomplete="list"
              onChange={e => {
                setEquipmentSearch(e.target.value);
                setEquipmentListOpen(true);
                if (!e.target.value) setForm(f => ({ ...f, equipmentId: "" }));
              }}
              onFocus={() => setEquipmentListOpen(true)}
              onKeyDown={handleEquipmentKeyDown}
              data-testid="input-equipment-search"
            />
            {equipmentListOpen && equipmentMatches.length > 0 && (
              <div
                id={equipmentListId}
                role="listbox"
                className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-44 overflow-y-auto"
              >
                {equipmentMatches.map((item, index) => {
                  const prop = properties.find(p => p.id === item.propertyId);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === equipmentHighlight}
                      className={`w-full text-left px-3 py-2 hover-elevate text-sm ${index === equipmentHighlight ? "bg-muted" : ""}`}
                      onMouseEnter={() => setEquipmentHighlight(index)}
                      onClick={() => selectEquipment(item)}
                      data-testid={`equipment-option-${item.id}`}
                    >
                      <span className="font-medium">{item.name}</span>
                      {prop && <span className="text-muted-foreground ml-1">— {prop.name}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {form.equipmentId && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                aria-label="Clear equipment selection"
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
              {EQUIPMENT_CATEGORIES.map(cat => (
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
            {sortByName(properties).map(p => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate" data-testid={`checkbox-property-${p.id}`}>
                <input
                  type="checkbox"
                  checked={form.propertyIds.includes(p.id)}
                  onChange={() => toggleProperty(p.id)}
                  className="rounded"
                />
                <span className="text-sm">
                  <PropertySelectLabel property={p} />
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

type ResourceLibraryDialogsExtraProps = Pick<
  ResourceLibraryContext,
  | "folderDialogOpen" | "setFolderDialogOpen"
  | "folderName" | "setFolderName"
  | "editingFolder" | "setEditingFolder"
  | "deleteFolderId" | "setDeleteFolderId"
  | "createFolderMutation" | "updateFolderMutation" | "deleteFolderMutation"
  | "handleFolderSubmit"
>;

export function ResourceLibraryDialogsExtra(props: ResourceLibraryDialogsExtraProps) {
  const {
    folderDialogOpen, setFolderDialogOpen,
    folderName, setFolderName,
    editingFolder, setEditingFolder,
    deleteFolderId, setDeleteFolderId,
    createFolderMutation, updateFolderMutation, deleteFolderMutation,
    handleFolderSubmit,
  } = props;

  return (
    <>
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
