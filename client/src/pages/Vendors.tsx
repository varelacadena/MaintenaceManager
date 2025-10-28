import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Vendor, Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Vendors() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Create form states
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: {
      name: string;
      email?: string;
      phoneNumber?: string;
      address?: string;
      contactPerson?: string;
      notes?: string;
    }) => {
      const response = await apiRequest("POST", "/api/vendors", vendorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({ title: "Vendor created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create vendor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, vendorData }: { vendorId: string; vendorData: any }) => {
      const response = await apiRequest("PATCH", `/api/vendors/${vendorId}`, vendorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsEditDialogOpen(false);
      toast({ title: "Vendor updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update vendor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const response = await apiRequest("DELETE", `/api/vendors/${vendorId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete vendor",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPhoneNumber("");
    setNewAddress("");
    setNewContactPerson("");
    setNewNotes("");
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    createVendorMutation.mutate({
      name: newName,
      email: newEmail || undefined,
      phoneNumber: newPhoneNumber || undefined,
      address: newAddress || undefined,
      contactPerson: newContactPerson || undefined,
      notes: newNotes || undefined,
    });
  };

  const handleUpdateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendor) {
      updateVendorMutation.mutate({
        vendorId: selectedVendor.id,
        vendorData: {
          name: editName,
          email: editEmail,
          phoneNumber: editPhoneNumber,
          address: editAddress,
          contactPerson: editContactPerson,
          notes: editNotes,
        },
      });
    }
  };

  const handleDeleteVendor = (vendorId: string) => {
    if (window.confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) {
      deleteVendorMutation.mutate(vendorId);
    }
  };

  const openEditDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditName(vendor.name || "");
    setEditEmail(vendor.email || "");
    setEditPhoneNumber(vendor.phoneNumber || "");
    setEditAddress(vendor.address || "");
    setEditContactPerson(vendor.contactPerson || "");
    setEditNotes(vendor.notes || "");
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-vendors-title">
            Vendor Management
          </h1>
          <p className="text-muted-foreground">Manage vendors and service providers</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-vendor">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Add a new vendor or service provider to the system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Vendor Name *</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    data-testid="input-new-vendor-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    data-testid="input-new-vendor-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    data-testid="input-new-vendor-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={newContactPerson}
                  onChange={(e) => setNewContactPerson(e.target.value)}
                  data-testid="input-new-vendor-contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  rows={2}
                  data-testid="input-new-vendor-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  data-testid="input-new-vendor-notes"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  data-testid="button-submit-create-vendor"
                >
                  {createVendorMutation.isPending ? "Creating..." : "Create Vendor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No vendors found. Add your first vendor to get started.
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contactPerson || "-"}</TableCell>
                    <TableCell>{vendor.email || "-"}</TableCell>
                    <TableCell>{vendor.phoneNumber || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openViewDialog(vendor)}
                          data-testid={`button-view-${vendor.id}`}
                          title="View Details"
                        >
                          <Building2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(vendor)}
                          data-testid={`button-edit-${vendor.id}`}
                          title="Edit Vendor"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteVendor(vendor.id)}
                          data-testid={`button-delete-${vendor.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update information for {selectedVendor?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateVendor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="editName">Vendor Name</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  data-testid="input-edit-vendor-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  data-testid="input-edit-vendor-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">Phone Number</Label>
                <Input
                  id="editPhoneNumber"
                  type="tel"
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  data-testid="input-edit-vendor-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editContactPerson">Contact Person</Label>
              <Input
                id="editContactPerson"
                value={editContactPerson}
                onChange={(e) => setEditContactPerson(e.target.value)}
                data-testid="input-edit-vendor-contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Textarea
                id="editAddress"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={2}
                data-testid="input-edit-vendor-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                data-testid="input-edit-vendor-notes"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateVendorMutation.isPending}
                data-testid="button-submit-edit-vendor"
              >
                {updateVendorMutation.isPending ? "Updating..." : "Update Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Vendor Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedVendor?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Vendor Name</p>
                <p className="font-medium">{selectedVendor.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedVendor.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{selectedVendor.phoneNumber || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{selectedVendor.contactPerson || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium whitespace-pre-wrap">{selectedVendor.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{selectedVendor.notes || "-"}</p>
              </div>

              {/* Job History Section */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2">Job History</h3>
                {vendorTasks && vendorTasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.name}</TableCell>
                          <TableCell>{task.status}</TableCell>
                          <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No job history found for this vendor.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{selectedVendor.createdAt ? new Date(selectedVendor.createdAt).toLocaleString() : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm">{selectedVendor.updatedAt ? new Date(selectedVendor.updatedAt).toLocaleString() : "-"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}