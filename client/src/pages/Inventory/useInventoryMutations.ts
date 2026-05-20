import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseInventoryErrorMessage } from "@/lib/inventoryUtils";
import type { InsertInventoryItem } from "@shared/schema";
import type { UseFormReturn } from "react-hook-form";
import type { InventoryFormValues } from "./inventoryFormSchema";

function invalidateInventory() {
  queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
}

type ToastFn = (opts: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

export function useInventoryMutations({
  toast,
  createForm,
  setIsCreateDialogOpen,
  setIsEditDialogOpen,
  setIsDeleteDialogOpen,
  setIsQuantityDialogOpen,
  setSelectedItem,
  setQuantityChange,
  setReceiveItem,
}: {
  toast: ToastFn;
  createForm: UseFormReturn<InventoryFormValues>;
  setIsCreateDialogOpen: (v: boolean) => void;
  setIsEditDialogOpen: (v: boolean) => void;
  setIsDeleteDialogOpen: (v: boolean) => void;
  setIsQuantityDialogOpen: (v: boolean) => void;
  setSelectedItem: (v: import("@shared/schema").InventoryItem | null) => void;
  setQuantityChange: (v: string) => void;
  setReceiveItem: (v: import("@shared/schema").InventoryItem | null) => void;
}) {
  const mutationErrorToast = (e: Error) => {
    toast({
      title: "Error",
      description: parseInventoryErrorMessage(e.message),
      variant: "destructive",
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Item added" });
    },
    onSettled: invalidateInventory,
    onError: mutationErrorToast,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInventoryItem> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item updated" });
    },
    onSettled: invalidateInventory,
    onError: mutationErrorToast,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Item deleted" });
    },
    onSettled: invalidateInventory,
    onError: mutationErrorToast,
  });

  const quantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: string; change: number }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}/quantity`, { change });
      return res.json();
    },
    onSuccess: () => {
      setIsQuantityDialogOpen(false);
      setSelectedItem(null);
      setQuantityChange("");
      setReceiveItem(null);
      toast({ title: "Quantity updated" });
    },
    onSettled: invalidateInventory,
    onError: mutationErrorToast,
  });

  const containerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/inventory/${id}/use-container`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Container used", description: "Stock updated" });
    },
    onSettled: invalidateInventory,
    onError: mutationErrorToast,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, stockStatus }: { id: string; stockStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}/status`, { stockStatus });
      return res.json();
    },
    onSettled: invalidateInventory,
    onError: mutationErrorToast,
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    quantityMutation,
    containerMutation,
    statusMutation,
    mutationErrorToast,
  };
}
