import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
  Play,
  FileText,
  Image,
  Link,
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCategoryStyle, CATEGORY_COLORS } from "@/lib/categoryColors";

type ResourceCategory = {
  id: string;
  name: string;
  color: string;
};

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "document" | "image" | "link";
  url: string;
  fileName: string | null;
  categoryId: string | null;
  category: ResourceCategory | null;
  propertyIds: string[];
  createdAt: string;
};

type Property = {
  id: string;
  name: string;
};

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  return null;
}

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const TYPE_ICONS = {
  video: Play,
  document: FileText,
  image: Image,
  link: Link,
};

const TYPE_LABELS = {
  video: "Video",
  document: "Document",
  image: "Image",
  link: "Link",
};

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

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "document" as "video" | "document" | "image" | "link",
    url: "",
    fileName: "",
    categoryId: "",
    propertyIds: [] as string[],
  });

  const { data: categories = [] } = useQuery<ResourceCategory[]>({
    queryKey: ["/api/resource-categories"],
  });

  const { data: resourceList = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
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

  function resetForm() {
    setForm({ title: "", description: "", type: "document", url: "", fileName: "", categoryId: "", propertyIds: [] });
  }

  function openCreate() {
    setEditResource(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(r: Resource) {
    setEditResource(r);
    setForm({
      title: r.title,
      description: r.description || "",
      type: r.type,
      url: r.url,
      fileName: r.fileName || "",
      categoryId: r.categoryId || "",
      propertyIds: r.propertyIds,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.url.trim()) {
      toast({ title: "Title and URL are required", variant: "destructive" });
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

  const filtered = resourceList.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchCat = categoryFilter === "all" || r.categoryId === categoryFilter;
    return matchSearch && matchType && matchCat;
  });

  const thumbnail = form.type === "video" ? getYoutubeThumbnail(form.url) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Resource Library</h1>
        </div>
        <Button onClick={openCreate} data-testid="button-add-resource">
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

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

      {/* Resource Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No resources found</p>
          <p className="text-sm mt-1">Add your first resource using the button above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(resource => {
            const Icon = TYPE_ICONS[resource.type];
            const thumb = resource.type === "video" ? getYoutubeThumbnail(resource.url) : null;
            const catStyle = resource.category ? getCategoryStyle(resource.category.color) : null;
            const linkedProps = properties.filter(p => resource.propertyIds.includes(p.id));
            return (
              <Card key={resource.id} data-testid={`card-resource-${resource.id}`} className="flex flex-col">
                {thumb && (
                  <div className="relative h-36 overflow-hidden rounded-t-md bg-muted">
                    <img src={thumb} alt={resource.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 rounded-full p-2">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className="flex-1 flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <p className="font-medium text-sm truncate" data-testid={`text-resource-title-${resource.id}`}>
                        {resource.title}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(resource)} data-testid={`button-edit-resource-${resource.id}`}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(resource.id)} data-testid={`button-delete-resource-${resource.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {resource.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-auto pt-1">
                    {resource.category && catStyle && (
                      <Badge style={catStyle} className="text-xs" data-testid={`badge-category-${resource.id}`}>
                        {resource.category.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[resource.type]}
                    </Badge>
                  </div>
                  {linkedProps.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {linkedProps.map(p => (
                        <span key={p.id} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setEditResource(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
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
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any, url: "" }))}>
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

            <div className="space-y-1.5">
              <Label>
                {form.type === "video" ? "YouTube URL" :
                 form.type === "link" ? "URL" :
                 "File URL"}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                placeholder={
                  form.type === "video" ? "https://www.youtube.com/watch?v=..." :
                  form.type === "link" ? "https://..." :
                  "Paste the file URL (upload via Files panel)"
                }
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                data-testid="input-resource-url"
              />
              {form.type === "video" && thumbnail && (
                <div className="mt-2 rounded-md overflow-hidden h-32 bg-muted">
                  <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              {(form.type === "document" || form.type === "image") && (
                <div className="space-y-1.5 mt-2">
                  <Label>File Name (displayed to users)</Label>
                  <Input
                    placeholder="e.g. Electrical_SOP_v2.pdf"
                    value={form.fileName}
                    onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
                    data-testid="input-resource-filename"
                  />
                </div>
              )}
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
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-resource"
            >
              {editResource ? "Save Changes" : "Add Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
    </div>
  );
}
