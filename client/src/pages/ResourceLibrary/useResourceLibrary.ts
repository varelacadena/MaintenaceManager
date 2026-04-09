import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export const EQUIPMENT_CATEGORIES_RESOURCE = [
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

export function getYoutubeThumbnail(url: string): string | null {
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

export function useResourceLibrary() {
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

  const [activeDrag, setActiveDrag] = useState<{ id: string; title: string } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

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

  const { data: currentFolderData, isError: isFolderDetailError, refetch: refetchFolderDetail } = useQuery<ResourceFolder>({
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
    onSuccess: () => {
      setDialogOpen(false);
      resetForm();
      toast({ title: "Resource created" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        properties.forEach(p => {
          queryClient.invalidateQueries({ queryKey: ["/api/properties", p.id, "resources"] });
        });
      }, 300);
    },
    onError: () => toast({ title: "Failed to create resource", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form & { id: string }) =>
      apiRequest("PATCH", `/api/resources/${data.id}`, data),
    onSuccess: () => {
      setDialogOpen(false);
      setEditResource(null);
      resetForm();
      toast({ title: "Resource updated" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        properties.forEach(p => {
          queryClient.invalidateQueries({ queryKey: ["/api/properties", p.id, "resources"] });
        });
      }, 300);
    },
    onError: () => toast({ title: "Failed to update resource", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resources/${id}`),
    onSuccess: () => {
      setDeleteId(null);
      toast({ title: "Resource deleted" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        properties.forEach(p => {
          queryClient.invalidateQueries({ queryKey: ["/api/properties", p.id, "resources"] });
        });
      }, 300);
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
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
      }, 300);
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
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
      }, 300);
    },
    onError: () => toast({ title: "Failed to rename folder", variant: "destructive" }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resource-folders/${id}`),
    onSuccess: () => {
      setDeleteFolderId(null);
      toast({ title: "Folder deleted" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      }, 300);
    },
    onError: () => toast({ title: "Failed to delete folder", variant: "destructive" }),
  });

  const moveResourceMutation = useMutation({
    mutationFn: (data: { id: string; folderId: string | null }) =>
      apiRequest("PATCH", `/api/resources/${data.id}`, { folderId: data.folderId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      const targetFolder = variables.folderId
        ? (folders.find(f => f.id === variables.folderId) || allFolders.find(f => f.id === variables.folderId))
        : null;
      toast({
        title: "Resource moved",
        description: targetFolder ? `Moved to "${targetFolder.name}"` : "Moved to Library root",
      });
    },
    onError: () => toast({ title: "Failed to move resource", variant: "destructive" }),
  });

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type: string; resourceId: string; title: string };
    setActiveDrag({ id: data.resourceId, title: data.title });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { over, active } = event;
    if (!over) return;
    const resourceId = active.data.current?.resourceId as string;
    const targetFolderId = over.data.current?.folderId as string | null;
    const resource = resourceList.find(r => r.id === resourceId);
    if (!resource) return;
    const currentFolder = resource.folderId || null;
    if (currentFolder === targetFolderId) return;
    moveResourceMutation.mutate({ id: resourceId, folderId: targetFolderId });
  }

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

  return {
    toast,
    search, setSearch,
    typeFilter, setTypeFilter,
    categoryFilter, setCategoryFilter,
    dialogOpen, setDialogOpen,
    deleteId, setDeleteId,
    editResource, setEditResource,
    newCategoryName, setNewCategoryName,
    newCategoryColor, setNewCategoryColor,
    showNewCategory, setShowNewCategory,
    isUploading, setIsUploading,
    pasteUrlMode, setPasteUrlMode,
    activeDrag, sensors,
    currentFolderId, setCurrentFolderId,
    folderDialogOpen, setFolderDialogOpen,
    folderName, setFolderName,
    editingFolder, setEditingFolder,
    deleteFolderId, setDeleteFolderId,
    form, setForm,
    equipmentSearch, setEquipmentSearch,
    categories, resourceList, isLoading, isResourcesError, refetchResources,
    folders, isFoldersLoading, isFoldersError, refetchFolders,
    currentFolderData, isFolderDetailError, refetchFolderDetail,
    allFolders, properties, allEquipment,
    createCategoryMutation, createMutation, updateMutation, deleteMutation,
    createFolderMutation, updateFolderMutation, deleteFolderMutation,
    moveResourceMutation,
    handleDragStart, handleDragEnd,
    resetForm, openCreate, openEdit, handleSubmit,
    toggleProperty, getUploadParameters, handleUploadComplete,
    openCreateFolder, openRenameFolder, handleFolderSubmit,
    navigateToFolder,
    breadcrumbs, filtered, filteredFolders,
    thumbnail, needsUpload,
  };
}

export type ResourceLibraryContext = ReturnType<typeof useResourceLibrary>;
