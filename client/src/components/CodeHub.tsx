import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Plus, Trash2, Pencil, ChevronDown, ChevronRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lockbox, LockboxCode } from "@shared/schema";

const lockboxFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location/zone is required"),
});

const codeFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

function LockboxCard({ lockbox }: { lockbox: Lockbox }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addCodeOpen, setAddCodeOpen] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: codes, isLoading: codesLoading } = useQuery<LockboxCode[]>({
    queryKey: ["/api/lockboxes", lockbox.id, "codes"],
    enabled: expanded,
  });

  const editForm = useForm({
    resolver: zodResolver(lockboxFormSchema),
    defaultValues: {
      name: lockbox.name,
      location: lockbox.location,
    },
  });

  const codeForm = useForm({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: "" },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; location: string; status?: string }) => {
      return await apiRequest("PATCH", `/api/lockboxes/${lockbox.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
      toast({ title: "Success", description: "Lockbox updated" });
      setEditOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/lockboxes/${lockbox.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
      toast({ title: "Success", description: "Lockbox deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = lockbox.status === "active" ? "inactive" : "active";
      return await apiRequest("PATCH", `/api/lockboxes/${lockbox.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addCodeMutation = useMutation({
    mutationFn: async (data: { code: string }) => {
      return await apiRequest("POST", `/api/lockboxes/${lockbox.id}/codes`, {
        ...data,
        lockboxId: lockbox.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes", lockbox.id, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
      toast({ title: "Success", description: "Code added" });
      setAddCodeOpen(false);
      codeForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleCodeMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      return await apiRequest("PATCH", `/api/lockbox-codes/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes", lockbox.id, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/lockbox-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes", lockbox.id, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
      toast({ title: "Success", description: "Code deleted" });
      setDeleteCodeId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activeCodes = codes?.filter((c) => c.status === "active").length ?? 0;

  return (
    <>
      <Card data-testid={`card-lockbox-${lockbox.id}`}>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Lock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base" data-testid={`text-lockbox-name-${lockbox.id}`}>
                {lockbox.name}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={lockbox.status === "active" ? "default" : "secondary"} data-testid={`badge-lockbox-status-${lockbox.id}`}>
                {lockbox.status}
              </Badge>
              <Badge variant="secondary" data-testid={`badge-lockbox-codes-${lockbox.id}`}>
                {activeCodes} active code{activeCodes !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-10" data-testid={`text-lockbox-location-${lockbox.id}`}>
            {lockbox.location}
          </p>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active:</span>
                <Switch
                  checked={lockbox.status === "active"}
                  onCheckedChange={() => toggleStatusMutation.mutate()}
                  data-testid={`switch-lockbox-status-${lockbox.id}`}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddCodeOpen(true);
                  }}
                  data-testid={`button-add-code-${lockbox.id}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Code
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    editForm.reset({ name: lockbox.name, location: lockbox.location });
                    setEditOpen(true);
                  }}
                  data-testid={`button-edit-lockbox-${lockbox.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                  data-testid={`button-delete-lockbox-${lockbox.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {codesLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : codes && codes.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Use Count</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                        <TableCell className="font-mono font-medium" data-testid={`text-code-value-${code.id}`}>
                          {code.code}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={code.status === "active"}
                            onCheckedChange={() =>
                              toggleCodeMutation.mutate({ id: code.id, currentStatus: code.status })
                            }
                            data-testid={`switch-code-status-${code.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" data-testid={`text-code-last-used-${code.id}`}>
                          {code.lastUsedAt
                            ? new Date(code.lastUsedAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell data-testid={`text-code-use-count-${code.id}`}>{code.useCount}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteCodeId(code.id)}
                            data-testid={`button-delete-code-${code.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No codes added yet
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lockbox</DialogTitle>
            <DialogDescription>Update lockbox details</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-lockbox-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Zone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-lockbox-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-lockbox">
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lockbox</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lockbox "{lockbox.name}" and all its codes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-lockbox">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              data-testid="button-confirm-delete-lockbox"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addCodeOpen} onOpenChange={setAddCodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Code</DialogTitle>
            <DialogDescription>Add a new access code to {lockbox.name}</DialogDescription>
          </DialogHeader>
          <Form {...codeForm}>
            <form
              onSubmit={codeForm.handleSubmit((data) => addCodeMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-new-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={addCodeMutation.isPending} data-testid="button-save-code">
                  {addCodeMutation.isPending ? "Adding..." : "Add Code"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCodeId} onOpenChange={(open) => !open && setDeleteCodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Code</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this access code. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-code">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCodeId && deleteCodeMutation.mutate(deleteCodeId)}
              data-testid="button-confirm-delete-code"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function CodeHub() {
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: lockboxes, isLoading } = useQuery<Lockbox[]>({
    queryKey: ["/api/lockboxes"],
  });

  const createForm = useForm({
    resolver: zodResolver(lockboxFormSchema),
    defaultValues: { name: "", location: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; location: string }) => {
      return await apiRequest("POST", "/api/lockboxes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lockboxes"] });
      toast({ title: "Success", description: "Lockbox created" });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)} data-testid="button-add-lockbox">
          <Plus className="mr-2 h-4 w-4" />
          Add Lockbox
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : lockboxes && lockboxes.length > 0 ? (
        <div className="space-y-3">
          {lockboxes.map((lockbox) => (
            <LockboxCard key={lockbox.id} lockbox={lockbox} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No lockboxes yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first lockbox to manage access codes
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lockbox</DialogTitle>
            <DialogDescription>Create a new lockbox for managing access codes</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Main Building Lockbox" data-testid="input-lockbox-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Zone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., North Parking Lot, Zone A" data-testid="input-lockbox-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-lockbox">
                  {createMutation.isPending ? "Creating..." : "Create Lockbox"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
