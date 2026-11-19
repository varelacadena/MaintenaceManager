import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { DestructiveDeleteDialog } from "@/components/DestructiveDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import type { ApprovedDriver, DriverPenalty, VehicleReservation } from "@shared/schema";

type DriverRow = ApprovedDriver & { activePenalty: boolean };
type DriverDetail = DriverRow & {
  penalties: DriverPenalty[];
  reservations: VehicleReservation[];
};
type DriverStatus = "active" | "inactive";
type DriverForm = {
  firstName: string;
  lastName: string;
  department: string;
  email: string;
  phone: string;
  status: DriverStatus;
  notes: string;
};
type EditorState = { mode: "add" } | { mode: "edit"; id: string } | null;

const EMPTY_FORM: DriverForm = {
  firstName: "",
  lastName: "",
  department: "",
  email: "",
  phone: "",
  status: "active",
  notes: "",
};

const REASONS = [
  { value: "late_return", label: "Late return" },
  { value: "no_checkin", label: "No check-in" },
  { value: "dirty", label: "Car left dirty" },
  { value: "low_fuel", label: "Low fuel" },
  { value: "damage", label: "Damage" },
  { value: "other", label: "Other" },
];

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const first = lines[0].toLowerCase();
  const start = first.includes("last") || first.includes("email") ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [firstName, lastName, department, email, phone] = line.split(",").map((part) => part.trim());
    return { firstName, lastName, department, email, phone, status: "active" as const };
  }).filter((row) => row.firstName && row.lastName);
}

function asStatus(status: string): DriverStatus {
  return status === "inactive" ? "inactive" : "active";
}

function formFromDriver(driver: DriverRow): DriverForm {
  return {
    firstName: driver.firstName,
    lastName: driver.lastName,
    department: driver.department || "",
    email: driver.email || "",
    phone: driver.phone || "",
    status: asStatus(driver.status),
    notes: driver.notes || "",
  };
}

function driverContact(driver: Pick<DriverRow, "email" | "phone">) {
  return driver.email || driver.phone || "No contact";
}

export default function Drivers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [driverToDelete, setDriverToDelete] = useState<DriverRow | null>(null);
  const [reason, setReason] = useState("late_return");
  const [penaltyNote, setPenaltyNote] = useState("");

  const driversQuery = useQuery<DriverRow[]>({
    queryKey: ["/api/approved-drivers", search],
    queryFn: async () => {
      const response = await fetch(`/api/approved-drivers?search=${encodeURIComponent(search)}`, { credentials: "include" });
      if (!response.ok) throw new Error(await parseApiError(response, "Failed to load drivers"));
      return response.json();
    },
  });

  const detailQuery = useQuery<DriverDetail>({
    queryKey: ["/api/approved-drivers", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await fetch(`/api/approved-drivers/${selectedId}`, { credentials: "include" });
      if (!response.ok) throw new Error(await parseApiError(response, "Failed to load driver"));
      return response.json();
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/approved-drivers"] });
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditor({ mode: "add" });
  };

  const openEdit = (driver: DriverRow) => {
    setForm(formFromDriver(driver));
    setFormError("");
    setEditor({ mode: "edit", id: driver.id });
  };

  const saveDriver = useMutation({
    mutationFn: async () => {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        department: form.department,
        email: form.email,
        phone: form.phone,
        status: form.status,
        notes: form.notes,
      };
      if (editor?.mode === "edit") {
        await apiRequest("PATCH", `/api/approved-drivers/${editor.id}`, payload);
        return "updated" as const;
      }
      await apiRequest("POST", "/api/approved-drivers", payload);
      return "added" as const;
    },
    onSuccess: (result) => {
      setEditor(null);
      setForm(EMPTY_FORM);
      toast({ title: result === "updated" ? "Driver updated" : "Driver added" });
      refresh();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const importDrivers = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/approved-drivers/import", { drivers: parseCsv(importText) });
      return response.json() as Promise<{ created: number; skipped: string[] }>;
    },
    onSuccess: (result) => {
      toast({
        title: `Imported ${result.created}`,
        description: result.skipped.length ? `Skipped ${result.skipped.length}.` : undefined,
      });
      setImportText("");
      setImportOpen(false);
      refresh();
    },
    onError: (error: Error) => setImportError(error.message),
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/approved-drivers/${id}`);
      return id;
    },
    onSuccess: (id) => {
      setDriverToDelete(null);
      setSelectedId((current) => (current === id ? null : current));
      toast({ title: "Driver deleted" });
      refresh();
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete driver", description: error.message, variant: "destructive" });
    },
  });

  const addPenalty = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      await apiRequest("POST", `/api/approved-drivers/${selectedId}/penalties`, { reason, note: penaltyNote });
    },
    onSuccess: () => {
      setPenaltyNote("");
      toast({ title: "Penalty applied" });
      refresh();
    },
    onError: (error: Error) => {
      toast({ title: "Could not apply penalty", description: error.message, variant: "destructive" });
    },
  });

  const clearPenalty = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/driver-penalties/${id}/clear`);
    },
    onSuccess: () => {
      toast({ title: "Penalty cleared" });
      refresh();
    },
    onError: (error: Error) => {
      toast({ title: "Could not clear penalty", description: error.message, variant: "destructive" });
    },
  });

  const drivers = driversQuery.data ?? [];
  const editing = editor?.mode === "edit";

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">Drivers</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Approved drivers who can request a campus vehicle.</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 min-h-0 px-2.5 text-xs"
            onClick={() => {
              setImportError("");
              setImportOpen(true);
            }}
            data-testid="button-import-drivers"
          >
            Import
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 min-h-0 px-2.5 text-xs"
            onClick={openAdd}
            data-testid="button-add-driver"
          >
            <Plus className="h-3.5 w-3.5" />
            Add driver
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search drivers"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="h-9"
        aria-label="Search drivers"
        data-testid="input-search-drivers"
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        {driversQuery.isLoading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading drivers...</p>
        ) : driversQuery.isError ? (
          <div className="space-y-2 px-3 py-6 text-center">
            <p className="text-sm text-destructive">{driversQuery.error.message}</p>
            <Button type="button" variant="outline" size="sm" className="h-8 min-h-0 text-xs" onClick={() => driversQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : drivers.length === 0 ? (
          <div className="space-y-2 px-3 py-8 text-center">
            <p className="text-sm font-medium">{search ? "No drivers match that search" : "No drivers yet"}</p>
            {!search && (
              <Button type="button" size="sm" className="h-8 min-h-0 text-xs" onClick={openAdd}>
                Add driver
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {drivers.map((driver) => (
              <li key={driver.id} className="px-3 py-2.5 sm:flex sm:items-center sm:gap-3" data-testid={`row-driver-${driver.id}`}>
                <div className="min-w-0 sm:flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {driver.firstName} {driver.lastName}
                    </p>
                    {driver.status !== "active" && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">Inactive</Badge>
                    )}
                    {driver.activePenalty && (
                      <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-medium">Penalty</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {driver.department || "No department"}
                    <span aria-hidden> · </span>
                    {driverContact(driver)}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-0 sm:flex sm:shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 min-h-0 px-2 text-xs"
                    onClick={() => openEdit(driver)}
                    data-testid={`button-edit-driver-${driver.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 min-h-0 px-2 text-xs"
                    onClick={() => setSelectedId(driver.id)}
                    data-testid={`button-details-driver-${driver.id}`}
                  >
                    Details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 min-h-0 px-2 text-xs text-destructive"
                    onClick={() => setDriverToDelete(driver)}
                    data-testid={`button-delete-driver-${driver.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditor(null);
            setFormError("");
          }
        }}
      >
        <DialogContent className="gap-3">
          <DialogHeader className="pr-6">
            <DialogTitle>{editing ? "Edit driver" : "Add driver"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this driver's contact information." : "Add someone who can request a campus vehicle."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError("");
              saveDriver.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="driver-first-name">First name</Label>
                <Input
                  id="driver-first-name"
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                  required
                  data-testid="input-driver-first-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driver-last-name">Last name</Label>
                <Input
                  id="driver-last-name"
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  required
                  data-testid="input-driver-last-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-department">Department</Label>
              <Input
                id="driver-department"
                value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
                data-testid="input-driver-department"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="driver-email">Email</Label>
                <Input
                  id="driver-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  data-testid="input-driver-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driver-phone">Phone</Label>
                <Input
                  id="driver-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  data-testid="input-driver-phone"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-status">Status</Label>
              <select
                id="driver-status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: asStatus(event.target.value) })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                data-testid="select-driver-status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-notes">Notes</Label>
              <Textarea
                id="driver-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                className="min-h-[4.5rem] text-sm"
                data-testid="input-driver-notes"
              />
            </div>
            <p className="text-xs text-muted-foreground">Add an email or a phone number.</p>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-9 min-h-0" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button type="submit" className="h-9 min-h-0" disabled={saveDriver.isPending} data-testid="button-save-driver">
                {saveDriver.isPending ? "Saving..." : editing ? "Save changes" : "Add driver"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="gap-3">
          <DialogHeader className="pr-6">
            <DialogTitle>Import drivers</DialogTitle>
            <DialogDescription>
              One driver per line: first name, last name, department, email, phone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={6}
            className="min-h-[8rem] text-sm"
            data-testid="input-driver-import"
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-9 min-h-0" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 min-h-0"
              onClick={() => {
                setImportError("");
                importDrivers.mutate();
              }}
              disabled={importDrivers.isPending || !importText.trim()}
            >
              {importDrivers.isPending ? "Importing..." : "Import list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="gap-3" data-testid="driver-detail">
          <DialogHeader className="pr-6">
            <DialogTitle>
              {detailQuery.data ? `${detailQuery.data.firstName} ${detailQuery.data.lastName}` : "Driver"}
            </DialogTitle>
            <DialogDescription className="break-all">
              {detailQuery.data
                ? `${detailQuery.data.department || "No department"} · ${detailQuery.data.email || "No email"} · ${detailQuery.data.phone || "No phone"}`
                : "Loading driver"}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isError && (
            <p className="text-sm text-destructive">{detailQuery.error.message}</p>
          )}

          {detailQuery.data && (
            <>
              {detailQuery.data.notes && (
                <p className="text-sm text-muted-foreground">{detailQuery.data.notes}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="penalty-reason">Penalty</Label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    id="penalty-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <Input
                    placeholder="Note"
                    value={penaltyNote}
                    onChange={(event) => setPenaltyNote(event.target.value)}
                    className="h-10"
                    aria-label="Penalty note"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 min-h-0"
                    onClick={() => addPenalty.mutate()}
                    disabled={addPenalty.isPending}
                  >
                    Apply penalty
                  </Button>
                </div>
                {detailQuery.data.penalties.map((penalty) => (
                  <div key={penalty.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span className="min-w-0 break-words">
                      {penalty.reason.replaceAll("_", " ")}
                      {penalty.clearedAt ? " · cleared" : " · active"}
                    </span>
                    {!penalty.clearedAt && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 min-h-0 shrink-0 px-2 text-xs"
                        onClick={() => clearPenalty.mutate(penalty.id)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-medium">Trips</h3>
                {detailQuery.data.reservations.length === 0 && (
                  <p className="text-sm text-muted-foreground">No trips yet.</p>
                )}
                {detailQuery.data.reservations.map((reservation) => (
                  <p key={reservation.id} className="break-words text-sm">
                    {reservation.status} · {reservation.purpose}
                  </p>
                ))}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-h-0"
                  onClick={() => {
                    const driver = drivers.find((item) => item.id === detailQuery.data.id) ?? detailQuery.data;
                    setSelectedId(null);
                    openEdit(driver);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-h-0 text-destructive"
                  onClick={() => {
                    const driver = drivers.find((item) => item.id === detailQuery.data.id) ?? detailQuery.data;
                    setDriverToDelete(driver);
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DestructiveDeleteDialog
        open={driverToDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteDriver.isPending) setDriverToDelete(null);
        }}
        entityLabel={driverToDelete ? `${driverToDelete.firstName} ${driverToDelete.lastName}` : "this driver"}
        entityType="driver"
        warningDetails={[
          "This driver will be removed from the approved list.",
          "Past trips stay on record with the driver's name.",
          "A driver with an open trip cannot be deleted. Mark them inactive instead.",
        ]}
        onConfirm={() => {
          if (driverToDelete) deleteDriver.mutate(driverToDelete.id);
        }}
        isPending={deleteDriver.isPending}
      />
    </div>
  );
}
