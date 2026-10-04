import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VENDOR_TRADES, vendorTradeLabel, type Vendor, type VendorTradeSlug } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { DestructiveDeleteDialog } from "@/components/DestructiveDeleteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const UNCATEGORIZED_TRADE = "uncategorized";

function toggleTrade(current: VendorTradeSlug[], slug: VendorTradeSlug): VendorTradeSlug[] {
  return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
}

function TradePicker({
  value,
  onChange,
  idPrefix,
}: {
  value: VendorTradeSlug[];
  onChange: (next: VendorTradeSlug[]) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <Label>Trades</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {VENDOR_TRADES.map((trade) => {
          const checked = value.includes(trade.slug);
          return (
            <label
              key={trade.slug}
              htmlFor={`${idPrefix}-trade-${trade.slug}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm cursor-pointer"
            >
              <Checkbox
                id={`${idPrefix}-trade-${trade.slug}`}
                checked={checked}
                onCheckedChange={() => onChange(toggleTrade(value, trade.slug))}
                data-testid={`${idPrefix}-trade-${trade.slug}`}
              />
              {trade.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function Vendors() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);

  // Create form states
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newTrades, setNewTrades] = useState<VendorTradeSlug[]>([]);

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTrades, setEditTrades] = useState<VendorTradeSlug[]>([]);

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
      trades?: VendorTradeSlug[];
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
      setVendorToDelete(null);
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
    setNewTrades([]);
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
      trades: newTrades,
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
          trades: editTrades,
        },
      });
    }
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setVendorToDelete(vendor);
  };

  const openEditDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditName(vendor.name || "");
    setEditEmail(vendor.email || "");
    setEditPhoneNumber(vendor.phoneNumber || "");
    setEditAddress(vendor.address || "");
    setEditContactPerson(vendor.contactPerson || "");
    setEditNotes(vendor.notes || "");
    setEditTrades((vendor.trades ?? []).filter((trade): trade is VendorTradeSlug =>
      VENDOR_TRADES.some((item) => item.slug === trade),
    ));
    setIsEditDialogOpen(true);
  };

  const tradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const trade of VENDOR_TRADES) counts.set(trade.slug, 0);
    let uncategorized = 0;
    for (const vendor of vendors) {
      const trades = vendor.trades ?? [];
      if (trades.length === 0) uncategorized += 1;
      for (const slug of trades) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return { counts, uncategorized };
  }, [vendors]);

  const visibleVendors = vendors.filter((vendor) => {
    if (!selectedTrade) return true;
    if (selectedTrade === UNCATEGORIZED_TRADE) return (vendor.trades ?? []).length === 0;
    return (vendor.trades ?? []).includes(selectedTrade);
  });

  const selectedTradeLabel = selectedTrade === UNCATEGORIZED_TRADE
    ? "Uncategorized"
    : selectedTrade
      ? vendorTradeLabel(selectedTrade)
      : "All Vendors";

  const openViewDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-3 p-3 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-vendors-title">
            Vendor Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage vendors and service providers</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" data-testid="button-create-vendor">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
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
              <TradePicker value={newTrades} onChange={setNewTrades} idPrefix="new" />
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

      <Card data-testid="vendor-trade-filters">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trades</CardTitle>
          <p className="text-sm text-muted-foreground">Find a vendor by the work you need done.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectedTrade === null ? "default" : "outline"}
              aria-pressed={selectedTrade === null}
              onClick={() => setSelectedTrade(null)}
              data-testid="filter-trade-all"
            >
              All
              <span className="ml-1.5 tabular-nums">{vendors.length}</span>
            </Button>
            {tradeCounts.uncategorized > 0 && (
              <Button
                type="button"
                size="sm"
                variant={selectedTrade === UNCATEGORIZED_TRADE ? "default" : "outline"}
                aria-pressed={selectedTrade === UNCATEGORIZED_TRADE}
                onClick={() => setSelectedTrade(selectedTrade === UNCATEGORIZED_TRADE ? null : UNCATEGORIZED_TRADE)}
                data-testid="filter-trade-uncategorized"
              >
                Uncategorized
                <span className="ml-1.5 tabular-nums">{tradeCounts.uncategorized}</span>
              </Button>
            )}
            {VENDOR_TRADES.map((trade) => {
              const count = tradeCounts.counts.get(trade.slug) ?? 0;
              const selected = selectedTrade === trade.slug;
              return (
                <Button
                  key={trade.slug}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  onClick={() => setSelectedTrade(selected ? null : trade.slug)}
                  data-testid={`filter-trade-${trade.slug}`}
                >
                  {trade.label}
                  <span className="ml-1.5 tabular-nums">{count}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selectedTradeLabel}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Trades</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {vendors.length === 0
                      ? "No vendors found. Add your first vendor to get started."
                      : `No vendors listed for ${selectedTradeLabel}.`}
                  </TableCell>
                </TableRow>
              ) : (
                visibleVendors.map((vendor) => (
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>
                      {(vendor.trades ?? []).length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(vendor.trades ?? []).map((trade) => (
                            <Badge key={trade} variant="secondary" data-testid={`badge-trade-${vendor.id}-${trade}`}>
                              {vendorTradeLabel(trade)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
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
                          onClick={() => handleDeleteVendor(vendor)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
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
            <TradePicker value={editTrades} onChange={setEditTrades} idPrefix="edit" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{selectedVendor.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{selectedVendor.phoneNumber || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trades</p>
                {(selectedVendor.trades ?? []).length === 0 ? (
                  <p className="font-medium">-</p>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedVendor.trades ?? []).map((trade) => (
                      <Badge key={trade} variant="secondary">{vendorTradeLabel(trade)}</Badge>
                    ))}
                  </div>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-xs sm:text-sm">{selectedVendor.createdAt ? new Date(selectedVendor.createdAt).toLocaleString() : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-xs sm:text-sm">{selectedVendor.updatedAt ? new Date(selectedVendor.updatedAt).toLocaleString() : "-"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DestructiveDeleteDialog
        open={!!vendorToDelete}
        onOpenChange={(open) => { if (!open) setVendorToDelete(null); }}
        entityLabel={vendorToDelete?.name ?? ""}
        entityType="vendor"
        requireConfirmationText={vendorToDelete?.name}
        onConfirm={() => vendorToDelete && deleteVendorMutation.mutate(vendorToDelete.id)}
        isPending={deleteVendorMutation.isPending}
      />
    </div>
  );
}
