import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityChange, setQuantityChange] = useState<string>("");

  const { data: inventoryItems, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Inventory item created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInventoryItem> }) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item",
        variant: "destructive",
      });
    },
  });

  const quantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: string; change: number }) => {
      const res = await fetch(`/api/inventory/${id}/quantity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsQuantityDialogOpen(false);
      setSelectedItem(null);
      setQuantityChange("");
      toast({
        title: "Success",
        description: "Quantity updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quantity",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<z.infer<typeof insertInventoryItemSchema>>({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: {
      name: "",
      description: "",
      quantity: 0,
      unit: "",
      location: "",
      minQuantity: 0,
      cost: "",
    },
  });

  const editForm = useForm<z.infer<typeof insertInventoryItemSchema>>({
    resolver: zodResolver(insertInventoryItemSchema),
  });

  const handleCreateSubmit = (data: z.infer<typeof insertInventoryItemSchema>) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof insertInventoryItemSchema>) => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    editForm.reset({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      unit: item.unit || "",
      location: item.location || "",
      minQuantity: item.minQuantity || 0,
      cost: item.cost || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleQuantityUpdate = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantityChange("");
    setIsQuantityDialogOpen(true);
  };

  const handleQuantitySubmit = () => {
    if (selectedItem && quantityChange) {
      const change = parseInt(quantityChange);
      if (!isNaN(change)) {
        quantityMutation.mutate({ id: selectedItem.id, change });
      }
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.minQuantity && item.quantity <= item.minQuantity;
  };

  if (!user || (user.role !== "admin" && user.role !== "technician")) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track and manage maintenance supplies and equipment</p>
        </div>
        <Button
          onClick={() => {
            createForm.reset();
            setIsCreateDialogOpen(true);
          }}
          data-testid="button-create-inventory"
          className="w-full sm:w-auto h-9 md:h-10 text-xs md:text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm md:text-base text-muted-foreground">Loading inventory...</p>
        </div>
      ) : !inventoryItems || inventoryItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg p-4">
          <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
          <p className="text-base md:text-lg font-medium">No inventory items yet</p>
          <p className="text-sm md:text-base text-muted-foreground mb-4">Get started by adding your first item</p>
          <Button
            onClick={() => {
              createForm.reset();
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-create-first-inventory"
            className="h-9 md:h-10 text-xs md:text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs md:text-sm whitespace-nowrap">Name</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Description</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap">Quantity</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap hidden md:table-cell">Unit</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">Min Qty</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap hidden md:table-cell">Cost</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap">Status</TableHead>
                <TableHead className="text-xs md:text-sm text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItems.map((item) => (
                <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                  <TableCell className="font-medium text-xs md:text-sm" data-testid={`text-name-${item.id}`}>
                    {item.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate text-xs md:text-sm hidden sm:table-cell">
                    {item.description || "-"}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="font-semibold" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityUpdate(item)}
                        data-testid={`button-update-quantity-${item.id}`}
                        className="h-7 w-7 p-0"
                      >
                        <TrendingUp className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">{item.unit || "-"}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell">{item.location || "-"}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell">{item.minQuantity || 0}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">{item.cost || "-"}</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    {isLowStock(item) ? (
                      <Badge variant="destructive" data-testid={`badge-low-stock-${item.id}`} className="text-xs whitespace-nowrap">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Low Stock</span>
                        <span className="sm:hidden">Low</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid={`badge-in-stock-${item.id}`} className="text-xs whitespace-nowrap">
                        <span className="hidden sm:inline">In Stock</span>
                        <span className="sm:hidden">OK</span>
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-${item.id}`}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {user.role === "admin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item)}
                          data-testid={`button-delete-${item.id}`}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-inventory">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to the inventory system</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Paint, Screws, Light Bulbs" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Additional details about the item" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="e.g., pcs, boxes, gallons" data-testid="input-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="e.g., Warehouse A, Shelf 3" data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Quantity (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? 0}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-min-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" value={field.value || ""} placeholder="e.g., 5.99" data-testid="input-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Creating..." : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-inventory">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update item information</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-edit-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Quantity (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? 0}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-min-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" value={field.value || ""} placeholder="e.g., 5.99" data-testid="input-edit-cost" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quantity Update Dialog */}
      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent data-testid="dialog-quantity-update">
          <DialogHeader>
            <DialogTitle>Update Quantity</DialogTitle>
            <DialogDescription>
              Adjust inventory for {selectedItem?.name}
              <br />
              Current quantity: <span className="font-semibold">{selectedItem?.quantity}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity Change</label>
              <Input
                type="number"
                placeholder="Enter positive or negative number (e.g., +10 or -5)"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                data-testid="input-quantity-change"
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add stock, negative to remove
              </p>
            </div>
            {quantityChange && selectedItem && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  New quantity will be:{" "}
                  <span className="font-semibold">
                    {selectedItem.quantity + parseInt(quantityChange || "0")}
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsQuantityDialogOpen(false)}
              data-testid="button-cancel-quantity"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuantitySubmit}
              disabled={!quantityChange || quantityMutation.isPending}
              data-testid="button-submit-quantity"
            >
              {quantityMutation.isPending ? "Updating..." : "Update Quantity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-inventory">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
