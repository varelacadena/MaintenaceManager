import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, Plus, Trash2, CheckCircle2, XCircle, UserCog, Edit2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EmergencyContact, User } from "@shared/schema";

export default function EmergencyContacts() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: contacts = [], isLoading } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts"],
  });

  const { data: technicians = [] } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "technician" }],
    queryFn: async () => {
      const res = await fetch("/api/users?role=technician");
      if (!res.ok) throw new Error("Failed to fetch technicians");
      return res.json();
    },
  });

  const handleSelectTechnician = (userId: string) => {
    if (userId === "manual") {
      resetForm();
      return;
    }
    const technician = technicians.find((t) => t.id === userId);
    if (technician) {
      setName(`${technician.firstName || ""} ${technician.lastName || ""}`.trim() || technician.username || "");
      setPhone(technician.phoneNumber || "");
      setEmail(technician.email || "");
      setRole("Technician");
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<EmergencyContact>) => {
      return await apiRequest("POST", "/api/emergency-contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts/active"] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Contact created",
        description: "Emergency contact has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmergencyContact> }) => {
      return await apiRequest("PATCH", `/api/emergency-contacts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts/active"] });
      resetForm();
      setIsDialogOpen(false);
      setEditingContact(null);
      toast({
        title: "Contact updated",
        description: "Emergency contact has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/emergency-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts/active"] });
      setDeleteContactId(null);
      toast({
        title: "Contact deleted",
        description: "Emergency contact has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/emergency-contacts/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts/active"] });
      toast({
        title: "Contact activated",
        description: "This contact is now the active after-hours contact.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to activate contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const clearActiveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/emergency-contacts/clear-active");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emergency-contacts/active"] });
      toast({
        title: "Active contact cleared",
        description: "No emergency contact is currently active.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear active contact",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setRole("");
    setNotes("");
    setIsActive(true);
  };

  const handleOpenDialog = (contact?: EmergencyContact) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name);
      setPhone(contact.phone);
      setEmail(contact.email || "");
      setRole(contact.role || "");
      setNotes(contact.notes || "");
      setIsActive(contact.isActive);
    } else {
      setEditingContact(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Missing required fields",
        description: "Name and phone number are required.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      role: role.trim() || null,
      notes: notes.trim() || null,
      isActive,
    };

    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activeContact = contacts.find(c => c.isActive);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading emergency contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Emergency Contacts</h1>
          <p className="text-muted-foreground">
            Manage after-hours emergency contacts visible to staff
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-contact">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {activeContact && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Active Emergency Contact
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearActiveMutation.mutate()}
                disabled={clearActiveMutation.isPending}
                data-testid="button-clear-active"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Clear Active
              </Button>
            </div>
            <CardDescription>
              This contact is currently displayed to all staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="font-semibold text-lg" data-testid="text-active-name">{activeContact.name}</div>
              {activeContact.role && (
                <Badge variant="secondary" className="w-fit">{activeContact.role}</Badge>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${activeContact.phone}`} className="hover:underline" data-testid="link-active-phone">
                    {activeContact.phone}
                  </a>
                </span>
                {activeContact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${activeContact.email}`} className="hover:underline" data-testid="link-active-email">
                      {activeContact.email}
                    </a>
                  </span>
                )}
              </div>
              {activeContact.notes && (
                <p className="text-sm text-muted-foreground mt-2" data-testid="text-active-notes">
                  {activeContact.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeContact && contacts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <XCircle className="w-5 h-5" />
              <span>No emergency contact is currently active. Staff will not see any after-hours contact.</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact) => (
          <Card 
            key={contact.id} 
            className={contact.isActive ? "ring-2 ring-green-500/50" : ""}
            data-testid={`card-contact-${contact.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate" data-testid={`text-contact-name-${contact.id}`}>
                    {contact.name}
                  </CardTitle>
                  {contact.role && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {contact.role}
                    </Badge>
                  )}
                </div>
                {contact.isActive && (
                  <Badge className="bg-green-500 text-white shrink-0">Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a 
                    href={`tel:${contact.phone}`} 
                    className="hover:underline truncate"
                    data-testid={`link-contact-phone-${contact.id}`}
                  >
                    {contact.phone}
                  </a>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="hover:underline truncate"
                      data-testid={`link-contact-email-${contact.id}`}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.notes && (
                  <p className="text-muted-foreground line-clamp-2 mt-2">{contact.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                {!contact.isActive && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => activateMutation.mutate(contact.id)}
                    disabled={activateMutation.isPending}
                    data-testid={`button-activate-${contact.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Set Active
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleOpenDialog(contact)}
                  data-testid={`button-edit-${contact.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteContactId(contact.id)}
                  data-testid={`button-delete-${contact.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contacts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Emergency Contacts</h3>
              <p className="text-muted-foreground mb-4">
                Add an emergency contact that staff can reach during after-hours.
              </p>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-first-contact">
                <Plus className="w-4 h-4 mr-2" />
                Add First Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact 
                ? "Update the emergency contact information." 
                : "Add a new after-hours emergency contact for staff to reach."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {!editingContact && technicians.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="select-technician">Select from Technicians</Label>
                <Select onValueChange={handleSelectTechnician}>
                  <SelectTrigger id="select-technician" data-testid="select-technician">
                    <SelectValue placeholder="Choose a technician or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <span className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4" />
                        Enter manually
                      </span>
                    </SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {`${tech.firstName || ""} ${tech.lastName || ""}`.trim() || tech.username}
                          {tech.phoneNumber && <span className="text-muted-foreground">({tech.phoneNumber})</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a technician to auto-fill their contact details, or enter manually below.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Smith"
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., (555) 123-4567"
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., john@example.com"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role/Title</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., On-Call Supervisor"
                data-testid="input-role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Instructions</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Call first, text if no answer within 5 minutes"
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel" className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
              className="w-full sm:w-auto"
            >
              {(createMutation.isPending || updateMutation.isPending) 
                ? "Saving..." 
                : editingContact ? "Update Contact" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Emergency Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this emergency contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContactId && deleteMutation.mutate(deleteContactId)}
              className="bg-destructive text-destructive-foreground"
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
