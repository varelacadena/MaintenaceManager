import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Building2, Edit2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { syncAfterDepartmentDelete, syncDepartmentQueries } from "@/lib/departmentQueryInvalidation";
import type { Area } from "@shared/schema";

type DepartmentPayload = {
  name: string;
  description: string | null;
};

export default function DepartmentSettings() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Area | null>(null);
  const [deleteDepartment, setDeleteDepartment] = useState<Area | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: departments = [], isLoading } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (department: Area) => {
    setEditingDepartment(department);
    setName(department.name);
    setDescription(department.description || "");
  };

  const closeDialogs = () => {
    setIsCreateOpen(false);
    setEditingDepartment(null);
    resetForm();
  };

  const createMutation = useMutation({
    mutationFn: async (data: DepartmentPayload) => {
      const res = await apiRequest("POST", "/api/areas", data);
      return (await res.json()) as Area;
    },
    onSuccess: async (created) => {
      await syncDepartmentQueries((areas) =>
        [...areas, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      closeDialogs();
      toast({
        title: "Department created",
        description: "The department is now available on the dashboard and work views.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create department",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DepartmentPayload }) => {
      const res = await apiRequest("PATCH", `/api/areas/${id}`, data);
      return (await res.json()) as Area;
    },
    onSuccess: async (updated) => {
      await syncDepartmentQueries((areas) =>
        areas
          .map((area) => (area.id === updated.id ? updated : area))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      closeDialogs();
      toast({
        title: "Department updated",
        description: "Changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update department",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/areas/${id}`);
      return id;
    },
    onSuccess: async (deletedId) => {
      await syncAfterDepartmentDelete((areas) => areas.filter((area) => area.id !== deletedId));
      setDeleteDepartment(null);
      toast({
        title: "Department deleted",
        description: "The department has been removed. Linked tasks were moved to Unassigned Department.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete department",
        description: error.message || "An error occurred while deleting the department.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "Name required",
        description: "Enter a department name.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
    };

    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteDepartment) return;
    deleteMutation.mutate(deleteDepartment.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const dialogOpen = isCreateOpen || !!editingDepartment;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Departments
            </CardTitle>
            <CardDescription>
              Manage Plant Services departments shown on the dashboard, work filters, task assignment, and analytics.
            </CardDescription>
          </div>
          <Button onClick={openCreate} data-testid="button-add-department">
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading departments...</p>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No departments configured</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Add departments like Grounds, Auto Shop, or Water Treatment.
              </p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first department
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {departments.map((department) => (
                <div
                  key={department.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  data-testid={`department-row-${department.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{department.name}</p>
                    {department.description ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{department.description}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 italic">No description</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(department)}
                      data-testid={`button-edit-department-${department.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteDepartment(department)}
                      data-testid={`button-delete-department-${department.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>
              Departments appear on the dashboard overview, work filters, and task forms.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-name">Name</Label>
              <Input
                id="department-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Auto Shop"
                data-testid="input-department-name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-description">Description (optional)</Label>
              <Textarea
                id="department-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of work this department handles"
                rows={3}
                data-testid="input-department-description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialogs}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} data-testid="button-save-department">
                {isSaving ? "Saving..." : editingDepartment ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDepartment} onOpenChange={(open) => !open && setDeleteDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDepartment?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the department from the catalog. Tasks, requests, and projects linked to it will move to Unassigned Department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-department"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
