import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  buildDisplayUrlFromUpload,
  getSignedUploadParameters,
  mapUploaderResultToPending,
} from "@/lib/uploadUtils";
import { getYoutubeThumbnail } from "@/lib/youtubeUtils";
import type { ResourceCategory, ResourceFolder } from "@shared/schema";
import {
  clearResourceFileFields,
  shouldUsePasteUrlMode,
  type ResourceFormState,
} from "./resourceUtils";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "document" | "image" | "link";
  url: string;
  objectPath?: string | null;
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

export { EQUIPMENT_CATEGORIES as EQUIPMENT_CATEGORIES_RESOURCE } from "@shared/equipmentCategories";

async function invalidateResourceQueries(propertyIds: string[] = []) {
  await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
  await Promise.all(
    propertyIds.map((propertyId) =>
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "resources"] })
    )
  );
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const [form, setForm] = useState<ResourceFormState>({
    title: "",
    description: "",
    type: "document",
    url: "",
    objectPath: "",
    fileName: "",
    categoryId: "",
    folderId: "",
    equipmentId: "",
    equipmentCategory: "",
    propertyIds: [],
  });

  const [equipmentSearch, setEquipmentSearch] = useState("");

  const { data: categories = [], isError: isCategoriesError, refetch: refetchCategories } = useQuery<ResourceCategory[]>({
    queryKey: ["/api/resource-categories"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: resourceList = [], isLoading, isError: isResourcesError, refetch: refetchResources } = useQuery<Resource[]>({
    queryKey: ["/api/resources", currentFolderId, typeFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFolderId) {
        params.set("folderId", currentFolderId);
      } else {
        params.set("folderId", "root");
      }
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      const res = await fetch(`/api/resources?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
    staleTime: 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });

  const { data: folderDetail, isError: isFolderDetailError, refetch: refetchFolderDetail } = useQuery<ResourceFolder & { breadcrumbs: { id: string; name: string }[] }>({
    queryKey: ["/api/resource-folders", "detail", currentFolderId],
    queryFn: async () => {
      const res = await fetch(`/api/resource-folders/${currentFolderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folder");
      return res.json();
    },
    enabled: !!currentFolderId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allFolders = [] } = useQuery<ResourceFolder[]>({
    queryKey: ["/api/resource-folders", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/resource-folders?all=true`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
    enabled: dialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: dialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allEquipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
    enabled: dialogOpen,
  });

  useEffect(() => {
    if (!editResource?.equipmentId || allEquipment.length === 0) return;
    const selected = allEquipment.find((item) => item.id === editResource.equipmentId);
    if (selected) setEquipmentSearch(selected.name);
  }, [editResource?.equipmentId, allEquipment]);

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiRequest("POST", "/api/resource-categories", data),
    onSuccess: async (response) => {
      const category = await response.json() as ResourceCategory;
      await queryClient.invalidateQueries({ queryKey: ["/api/resource-categories"] });
      setForm((current) => ({ ...current, categoryId: category.id }));
      setNewCategoryName("");
      setNewCategoryColor("gray");
      setShowNewCategory(false);
      toast({ title: "Category created" });
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: ResourceFormState) => apiRequest("POST", "/api/resources", data),
    onSuccess: async (_response, variables) => {
      setDialogOpen(false);
      resetForm();
      toast({ title: "Resource created" });
      await invalidateResourceQueries(variables.propertyIds);
    },
    onError: () => toast({ title: "Failed to create resource", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ResourceFormState & { id: string }) =>
      apiRequest("PATCH", `/api/resources/${data.id}`, data),
    onSuccess: async (_response, variables) => {
      setDialogOpen(false);
      setEditResource(null);
      resetForm();
      toast({ title: "Resource updated" });
      await invalidateResourceQueries(variables.propertyIds);
    },
    onError: () => toast({ title: "Failed to update resource", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resources/${id}`),
    onSuccess: async () => {
      setDeleteId(null);
      toast({ title: "Resource deleted" });
      await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "/api/properties" &&
          query.queryKey[2] === "resources",
      });
    },
    onError: () => toast({ title: "Failed to delete resource", variant: "destructive" }),
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId: string | null }) =>
      apiRequest("POST", "/api/resource-folders", data),
    onSuccess: async () => {
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
      toast({ title: "Folder created" });
      await queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
    },
    onError: () => toast({ title: "Failed to create folder", variant: "destructive" }),
  });

  const updateFolderMutation = useMutation({
    mutationFn: (data: { id: string; name: string }) =>
      apiRequest("PATCH", `/api/resource-folders/${data.id}`, { name: data.name }),
    onSuccess: async () => {
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
      toast({ title: "Folder renamed" });
      await queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
    },
    onError: () => toast({ title: "Failed to rename folder", variant: "destructive" }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/resource-folders/${id}`),
    onSuccess: async () => {
      setDeleteFolderId(null);
      toast({ title: "Folder deleted" });
      await queryClient.invalidateQueries({ queryKey: ["/api/resource-folders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: () => toast({ title: "Failed to delete folder", variant: "destructive" }),
  });

  const moveResourceMutation = useMutation({
    mutationFn: (data: { id: string; folderId: string | null }) =>
      apiRequest("PATCH", `/api/resources/${data.id}`, { folderId: data.folderId }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      const targetFolder = variables.folderId
        ? (folders.find((folder) => folder.id === variables.folderId) || allFolders.find((folder) => folder.id === variables.folderId))
        : null;
      toast({
        title: "Resource moved",
        description: targetFolder ? `Moved to "${targetFolder.name}"` : "Moved to Library root",
      });
    },
    onError: () => toast({ title: "Failed to move resource", variant: "destructive" }),
  });

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type?: string; resourceId?: string; title?: string } | undefined;
    if (!data || data.type !== "resource" || !data.resourceId || !data.title) return;
    setActiveDrag({ id: data.resourceId, title: data.title });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { over, active } = event;
    if (!over) return;
    const resourceId = active.data.current?.resourceId as string | undefined;
    const targetFolderId = over.data.current?.folderId as string | null | undefined;
    if (!resourceId || targetFolderId === undefined) return;
    const resource = resourceList.find((item) => item.id === resourceId);
    if (!resource) return;
    const currentFolder = resource.folderId || null;
    if (currentFolder === targetFolderId) return;
    moveResourceMutation.mutate({ id: resourceId, folderId: targetFolderId });
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      type: "document",
      url: "",
      objectPath: "",
      fileName: "",
      categoryId: "",
      folderId: currentFolderId || "",
      equipmentId: "",
      equipmentCategory: "",
      propertyIds: [],
    });
    setPasteUrlMode(false);
    setIsUploading(false);
    setEquipmentSearch("");
  }

  function openCreate() {
    setEditResource(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(resource: Resource) {
    setEditResource(resource);
    const selectedEq = resource.equipmentId ? allEquipment.find((item) => item.id === resource.equipmentId) : null;
    setEquipmentSearch(selectedEq ? selectedEq.name : "");
    setForm({
      title: resource.title,
      description: resource.description || "",
      type: resource.type,
      url: resource.url,
      objectPath: resource.objectPath || "",
      fileName: resource.fileName || "",
      categoryId: resource.categoryId || "",
      folderId: resource.folderId || "",
      equipmentId: resource.equipmentId || "",
      equipmentCategory: resource.equipmentCategory || "",
      propertyIds: resource.propertyIds,
    });
    setPasteUrlMode(shouldUsePasteUrlMode(resource.type, resource.url, resource.objectPath));
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
    if (form.equipmentId) {
      const selectedEquipment = allEquipment.find((item) => item.id === form.equipmentId);
      if (selectedEquipment && form.propertyIds.length > 0 && !form.propertyIds.includes(selectedEquipment.propertyId)) {
        toast({
          title: "Include the equipment property",
          description: "Link the equipment's property or clear property links.",
          variant: "destructive",
        });
        return;
      }
    }
    if (editResource) {
      updateMutation.mutate({ ...form, id: editResource.id });
    } else {
      createMutation.mutate(form);
    }
  }

  function toggleProperty(propertyId: string) {
    setForm((current) => ({
      ...current,
      propertyIds: current.propertyIds.includes(propertyId)
        ? current.propertyIds.filter((id) => id !== propertyId)
        : [...current.propertyIds, propertyId],
    }));
  }

  async function getUploadParameters() {
    setIsUploading(true);
    try {
      return await getSignedUploadParameters();
    } catch (error) {
      setIsUploading(false);
      throw error;
    }
  }

  function handleUploadComplete(result: { successful?: Array<Record<string, unknown>>; failed?: unknown[] }) {
    setIsUploading(false);
    const file = result.successful?.[0];
    if (file) {
      const pending = mapUploaderResultToPending(file as Parameters<typeof mapUploaderResultToPending>[0]);
      setForm((current) => ({
        ...current,
        url: pending.objectUrl,
        objectPath: pending.objectPath || "",
        fileName: current.fileName || pending.fileName,
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

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
  }

  const breadcrumbItems = folderDetail?.breadcrumbs || [];

  const filtered = resourceList.filter((resource) => {
    const matchSearch = !search ||
      resource.title.toLowerCase().includes(search.toLowerCase()) ||
      (resource.description || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const filteredFolders = folders.filter((folder) => {
    if (!search) return true;
    return folder.name.toLowerCase().includes(search.toLowerCase());
  });

  const thumbnail = form.type === "video" ? getYoutubeThumbnail(form.url) : null;

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
    categories, isCategoriesError, refetchCategories,
    resourceList, isLoading, isResourcesError, refetchResources,
    folders, isFoldersLoading, isFoldersError, refetchFolders,
    isFolderDetailError, refetchFolderDetail,
    allFolders, properties, allEquipment,
    createCategoryMutation, createMutation, updateMutation, deleteMutation,
    createFolderMutation, updateFolderMutation, deleteFolderMutation,
    moveResourceMutation,
    handleDragStart, handleDragEnd,
    resetForm, openCreate, openEdit, handleSubmit,
    toggleProperty, getUploadParameters, handleUploadComplete,
    openCreateFolder, openRenameFolder, handleFolderSubmit,
    navigateToFolder, clearFilters,
    breadcrumbs: breadcrumbItems, filtered, filteredFolders,
    thumbnail,
    clearResourceFileFields,
  };
}

export type ResourceLibraryContext = ReturnType<typeof useResourceLibrary>;
