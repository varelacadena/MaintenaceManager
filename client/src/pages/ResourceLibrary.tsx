import { useState } from "react";
import { toDisplayUrl } from "@/lib/imageUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  BookOpen,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Link as LinkIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCategoryStyle, CATEGORY_COLORS } from "@/lib/categoryColors";
import ResourceCard from "@/components/ResourceCard";
import { ObjectUploader } from "@/components/ObjectUploader";

type ResourceCategory = {
  id: string;
  name: string;
  color: string;
};

type ResourceFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  breadcrumbs?: { id: string; name: string }[];
};

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "document" | "image" | "link";
  url: string;
  fileName: string | null;
  categoryId: string | null;
  folderId: string | null;
  equipmentId: string | null;
  equipmentCategory: string | null;
  category: ResourceCategory | null;
  propertyIds: string[];
  createdAt: string;
};

type Property = {
  id: string;
  name: string;
};

type Equipment = {
  id: string;
  name: string;
  category: string;
  propertyId: string;
};

const EQUIPMENT_CATEGORIES_RESOURCE = [
  { slug: "hvac", label: "HVAC" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing" },
  { slug: "mechanical", label: "Mechanical / Fleet" },
  { slug: "appliances", label: "Appliances" },
  { slug: "grounds", label: "Grounds / Landscaping" },
  { slug: "janitorial", label: "Janitorial" },
  { slug: "structural", label: "Structural" },
  { slug: "water_treatment", label: "Water Treatment" },
  { slug: "general", label: "General" },
];

function getYoutubeThumbnail(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
  }
  return null;
}

export default function ResourceLibrary() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("gray");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pasteUrlMode, setPasteUrlMode] = useState(false);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "document" as "video" | "document" | "image" | "link",
    url: "",
    fileName: "",
    categoryId: "",
    folderId: "" as string,
    equipmentId: "",
    equipmentCategory: "",
    propertyIds: [] as string[],
  });

  const [equipmentSearch, setEquipmentSearch] = useState("");

  const { data: categories = [] } = useQuery<ResourceCategory[]>({
    queryKey: ["/api/resource-categories"],
  });

  const { data: resourceList = [], isLoading, isError: isResourcesError, refetch: refetchResources } = useQuery<Resource[]>({
    queryKey: ["/api/resources", currentFolderId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFolderId) {
        params.set("folderId", currentFolderId);
      } else {
        params.set("folderId", "root");
      }
      const res = await fetch(`/api/resources?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
  });

  const { data: folders = [], isLoading: isFoldersLoading, isError: isFoldersError, refetch: refetchFolders } = useQuery<ResourceFolder[]>({
    queryKey: ["/api/resource-folders", currentFolderId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("parentId", currentFolderId);
      const res = await fetch(`/api/resource-folders?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  const { data: currentFolderData } = useQuery<ResourceFolder>({
    queryKey: ["/api/resource-folders", "detail", currentFolderId],
    queryFn: async () => {
      const res = await fetch(`/api/resource-folders/${currentFolderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folder");
      return res.json();
    },
    enabled: !!currentFolderId,
  });

  const { data: allFolders = [] } = useQuery<ResourceFolder[]>({
    queryKey: ["/api/resource-folders", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/resource-folders?all=true`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allEquipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiRequest("POST", "/api/resource-categories", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/resource-categories"] });
      setNewCategoryName("");
      setNewCategoryColor("gray");
      setShowNewCategory(false);
      toast({ title: "Category created" });
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/resources", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      properties.forEach(p => {
        queryClient.invalidateQueries({ queryKey: ["/api/properties", p.id, "resources"] });
      });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Resource created" });
    },
    onError: () => toast({ title: "Failed to create resource", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form & { id: string }) =>
      apiRequest("PATCH", `/api/resources/${data.id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      properties.forEach(p => {
        queryClient.invalidateQueries({ queryKey: ["/api/properties", p.id, "resources"] });
      });
      setDialogOpen(false);
      setEditResource(null);
      resetForm();
      toast({ title: "Resource updated" });
    },
    onError: () => toast({ title: "Failed to update resource", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resources/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      properties.forEach(p => {
        queryClient.invalidateQueries({ queryKey: ["/api/properties", p.id, "resources"] });
      });
      setDeleteId(null);
      toast({ title: "Resource deleted" });
    },
    onError: () => toast({ title: "Failed to delete resource", variant: "destructive" }),
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId: string | null }) =>
      apiRequest("POST", "/api/resource-folders", data),
    onSuccess: () => {
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
      toast({ title: "Folder created" });
      queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
    },
    onError: () => toast({ title: "Failed to create folder", variant: "destructive" }),
  });

  const updateFolderMutation = useMutation({
    mutationFn: (data: { id: string; name: string }) =>
      apiRequest("PATCH", `/api/resource-folders/${data.id}`, { name: data.name }),
    onSuccess: () => {
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
      toast({ title: "Folder renamed" });
      queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
    },
    onError: () => toast({ title: "Failed to rename folder", variant: "destructive" }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resource-folders/${id}`),
    onSuccess: () => {
      setDeleteFolderId(null);
      toast({ title: "Folder deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: () => toast({ title: "Failed to delete folder", variant: "destructive" }),
  });

  function resetForm() {
    setForm({ title: "", description: "", type: "document", url: "", fileName: "", categoryId: "", folderId: currentFolderId || "", equipmentId: "", equipmentCategory: "", propertyIds: [] });
    setPasteUrlMode(false);
    setIsUploading(false);
    setEquipmentSearch("");
  }

  function openCreate() {
    setEditResource(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(r: Resource) {
    setEditResource(r);
    const selectedEq = r.equipmentId ? allEquipment.find(e => e.id === r.equipmentId) : null;
    setEquipmentSearch(selectedEq ? selectedEq.name : "");
    setForm({
      title: r.title,
      description: r.description || "",
      type: r.type,
      url: r.url,
      fileName: r.fileName || "",
      categoryId: r.categoryId || "",
      folderId: r.folderId || "",
      equipmentId: r.equipmentId || "",
      equipmentCategory: r.equipmentCategory || "",
      propertyIds: r.propertyIds,
    });
    setPasteUrlMode(true);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!form.url.trim()) {
      toast({ title: "A URL or uploaded file is required", variant: "destructive" });
      return;
    }
    if (editResource) {
      updateMutation.mutate({ ...form, id: editResource.id });
    } else {
      createMutation.mutate(form);
    }
  }

  function toggleProperty(pid: string) {
    setForm(f => ({
      ...f,
      propertyIds: f.propertyIds.includes(pid)
        ? f.propertyIds.filter(id => id !== pid)
        : [...f.propertyIds, pid],
    }));
  }

  async function getUploadParameters() {
    const res = await apiRequest("POST", "/api/objects/upload");
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL };
  }

  function handleUploadComplete(result: any) {
    setIsUploading(false);
    const file = result.successful?.[0];
    if (file) {
      setForm(f => ({
        ...f,
        url: file.url || file.objectUrl || file.uploadURL,
        fileName: f.fileName || file.fileName || file.name || "",
      }));
      toast({ title: "File uploaded successfully" });
    } else if (result.failed?.length) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  }

  function openCreateFolder() {
    setEditingFolder(null);
    setFolderName("");
    setFolderDialogOpen(true);
  }

  function openRenameFolder(folder: ResourceFolder) {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  }

  function handleFolderSubmit() {
    if (!folderName.trim()) {
      toast({ title: "Folder name is required", variant: "destructive" });
      return;
    }
    if (editingFolder) {
      updateFolderMutation.mutate({ id: editingFolder.id, name: folderName.trim() });
    } else {
      createFolderMutation.mutate({ name: folderName.trim(), parentId: currentFolderId });
    }
  }

  function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId);
    setSearch("");
  }

  const breadcrumbs = currentFolderData?.breadcrumbs || [];

  const filtered = resourceList.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchCat = categoryFilter === "all" || r.categoryId === categoryFilter;
    return matchSearch && matchType && matchCat;
  });

  const filteredFolders = folders.filter(f => {
    if (!search) return true;
    return f.name.toLowerCase().includes(search.toLowerCase());
  });

  const thumbnail = form.type === "video" ? getYoutubeThumbnail(form.url) : null;
  const needsUpload = (form.type === "document" || form.type === "image") && !pasteUrlMode;

  return (
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

      {/* Breadcrumbs */}
      {currentFolderId && (
        <nav className="flex items-center gap-1 text-sm" data-testid="breadcrumb-nav">
          <button
            onClick={() => navigateToFolder(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="breadcrumb-root"
          >
            Library
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-medium" data-testid={`breadcrumb-current-${crumb.id}`}>{crumb.name}</span>
              ) : (
                <button
                  onClick={() => navigateToFolder(crumb.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`breadcrumb-${crumb.id}`}
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Filters */}
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

      {/* Folders + Resource List */}
      {(isResourcesError || isFoldersError) ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40 text-destructive" />
          <p className="font-medium text-foreground">Failed to load resources</p>
          <p className="text-sm mt-1">Something went wrong while loading this page.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => { refetchFolders(); refetchResources(); }}
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
          {/* Folders first */}
          {filteredFolders
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
            .map(folder => (
              <div
                key={folder.id}
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
                <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-folder-menu-${folder.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setTimeout(() => openRenameFolder(folder), 0);
                        }}
                        data-testid={`button-rename-folder-${folder.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setTimeout(() => setDeleteFolderId(folder.id), 0);
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
              </div>
            ))}
          {/* Resources */}
          {[...filtered]
            .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
            .map(resource => {
              const linkedProps = properties.filter(p => resource.propertyIds.includes(p.id));
              return (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  variant="list"
                  onEdit={() => openEdit(resource)}
                  onDelete={() => setDeleteId(resource.id)}
                  linkedProperties={linkedProps.map(p => p.name)}
                />
              );
            })}
        </div>
      )}

      {/* Create/Edit Resource Dialog */}
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

            {/* URL / Upload field — varies by type */}
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

                    {/* File name field shown after upload */}
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

            {/* Folder */}
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

            {/* Equipment Linking */}
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

      {/* Delete Resource Confirm */}
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

      {/* Create/Rename Folder Dialog */}
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

      {/* Delete Folder Confirm */}
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
    </div>
  );
}
