import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  BookOpen,
  Folder,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  AlertTriangle,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import ResourceCard from "@/components/ResourceCard";
import { useResourceLibrary } from "./useResourceLibrary";
import { ResourceLibraryDialogs } from "./ResourceLibraryDialogs";

type ResourceFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  breadcrumbs?: { id: string; name: string }[];
};

function DroppableFolder({ folder, children }: { folder: { id: string }; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${folder.id}`, data: { type: "folder", folderId: folder.id } });
  return (
    <div ref={setNodeRef} className={`transition-colors ${isOver ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}>
      {children}
    </div>
  );
}

function DroppableBreadcrumb({ folderId, children }: { folderId: string | null; children: React.ReactNode }) {
  const droppableId = folderId ? `breadcrumb-${folderId}` : "breadcrumb-root";
  const { isOver, setNodeRef } = useDroppable({ id: droppableId, data: { type: "breadcrumb", folderId } });
  return (
    <span ref={setNodeRef} className={`rounded px-1 -mx-1 transition-colors ${isOver ? "ring-2 ring-primary bg-primary/10" : ""}`}>
      {children}
    </span>
  );
}

function DraggableResource({ resource, children }: { resource: { id: string; title: string }; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `resource-${resource.id}`,
    data: { type: "resource", resourceId: resource.id, title: resource.title },
  });
  return (
    <div ref={setNodeRef} className={`relative ${isDragging ? "opacity-30" : ""}`}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 text-muted-foreground/40 hover:text-muted-foreground"
        data-testid={`drag-handle-${resource.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  );
}

function FolderActionMenu({ folder, onRename, onDelete }: {
  folder: ResourceFolder;
  onRename: (folder: ResourceFolder) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" data-testid={`button-folder-menu-${folder.id}`}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              requestAnimationFrame(() => onRename(folder));
            }}
            data-testid={`button-rename-folder-${folder.id}`}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              requestAnimationFrame(() => onDelete(folder.id));
            }}
            className="text-destructive"
            data-testid={`button-delete-folder-${folder.id}`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ResourceLibrary() {
  const ctx = useResourceLibrary();
  const {
    search, setSearch,
    typeFilter, setTypeFilter,
    categoryFilter, setCategoryFilter,
    activeDrag, sensors,
    currentFolderId,
    categories, resourceList, isLoading, isResourcesError, refetchResources,
    folders, isFoldersLoading, isFoldersError, refetchFolders,
    isFolderDetailError, refetchFolderDetail,
    properties,
    handleDragStart, handleDragEnd,
    openCreate, openEdit,
    openCreateFolder, openRenameFolder,
    navigateToFolder,
    breadcrumbs, filtered, filteredFolders,
    setDeleteId, setDeleteFolderId,
  } = ctx;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Resource Library</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreateFolder} data-testid="button-new-folder">
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={openCreate} data-testid="button-add-resource">
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </div>

      {currentFolderId && (
        <nav className="flex items-center gap-1 text-sm" data-testid="breadcrumb-nav">
          <DroppableBreadcrumb folderId={null}>
            <button
              onClick={() => navigateToFolder(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="breadcrumb-root"
            >
              Library
            </button>
          </DroppableBreadcrumb>
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-medium" data-testid={`breadcrumb-current-${crumb.id}`}>{crumb.name}</span>
              ) : (
                <DroppableBreadcrumb folderId={crumb.id}>
                  <button
                    onClick={() => navigateToFolder(crumb.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`breadcrumb-${crumb.id}`}
                  >
                    {crumb.name}
                  </button>
                </DroppableBreadcrumb>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-resources"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36" data-testid="select-type-filter">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="link">Link</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-testid="select-category-filter">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(isResourcesError || isFoldersError || isFolderDetailError) ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40 text-destructive" />
          <p className="font-medium text-foreground">Failed to load resources</p>
          <p className="text-sm mt-1">Something went wrong while loading this page.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => { refetchFolders(); refetchResources(); if (currentFolderId) refetchFolderDetail(); }}
            data-testid="button-retry-load"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : (isLoading || isFoldersLoading) ? (
        <div className="border rounded-md divide-y">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse" />
          ))}
        </div>
      ) : (filteredFolders.length === 0 && filtered.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No resources found</p>
          <p className="text-sm mt-1">
            {currentFolderId
              ? "This folder is empty. Add resources or create subfolders."
              : "Add your first resource using the button above"}
          </p>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {filteredFolders
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
            .map(folder => (
              <DroppableFolder key={folder.id} folder={folder}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate"
                  onClick={() => navigateToFolder(folder.id)}
                  data-testid={`folder-item-${folder.id}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-folder-name-${folder.id}`}>
                      {folder.name}
                    </p>
                  </div>
                  <FolderActionMenu
                    folder={folder}
                    onRename={openRenameFolder}
                    onDelete={(id) => setDeleteFolderId(id)}
                  />
                </div>
              </DroppableFolder>
            ))}
          {[...filtered]
            .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
            .map(resource => {
              const linkedProps = properties.filter(p => resource.propertyIds.includes(p.id));
              return (
                <DraggableResource key={resource.id} resource={resource}>
                  <ResourceCard
                    resource={resource}
                    variant="list"
                    onEdit={() => openEdit(resource)}
                    onDelete={() => setDeleteId(resource.id)}
                    linkedProperties={linkedProps.map(p => p.name)}
                  />
                </DraggableResource>
              );
            })}
        </div>
      )}

      <ResourceLibraryDialogs {...ctx} />

      <DragOverlay>
        {activeDrag && (
          <div className="flex items-center gap-2 px-4 py-3 bg-card border rounded-md shadow-lg text-sm font-medium max-w-xs truncate">
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{activeDrag.title}</span>
          </div>
        )}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
