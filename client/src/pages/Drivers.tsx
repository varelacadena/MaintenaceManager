import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import type { ApprovedDriver, DriverPenalty, VehicleReservation } from "@shared/schema";

type DriverRow = ApprovedDriver & { activePenalty: boolean };
type DriverDetail = DriverRow & {
  penalties: DriverPenalty[];
  reservations: VehicleReservation[];
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

export default function Drivers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", department: "", email: "", phone: "" });
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
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

  const addDriver = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/approved-drivers", { ...form, status: "active" });
    },
    onSuccess: () => {
      setForm({ firstName: "", lastName: "", department: "", email: "", phone: "" });
      setMessage("Driver added");
      refresh();
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const importDrivers = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/approved-drivers/import", { drivers: parseCsv(importText) });
      return response.json() as Promise<{ created: number; skipped: string[] }>;
    },
    onSuccess: (result) => {
      setMessage(`Imported ${result.created}. Skipped ${result.skipped.length}.`);
      setImportText("");
      refresh();
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: "active" | "inactive") => {
      if (!detailQuery.data) return;
      await apiRequest("PATCH", `/api/approved-drivers/${detailQuery.data.id}`, {
        ...detailQuery.data,
        status,
      });
    },
    onSuccess: refresh,
  });

  const addPenalty = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      await apiRequest("POST", `/api/approved-drivers/${selectedId}/penalties`, { reason, note: penaltyNote });
    },
    onSuccess: () => {
      setPenaltyNote("");
      refresh();
    },
  });

  const clearPenalty = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/driver-penalties/${id}/clear`);
    },
    onSuccess: refresh,
  });

  return (
    <div className="w-full min-w-0 overflow-x-hidden p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Drivers</h1>
        <p className="text-sm text-muted-foreground">Approved drivers who can request a campus vehicle. This is not a login.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium">Add a driver</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input className="h-11 text-base" placeholder="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            <Input className="h-11 text-base" placeholder="Last name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            <Input className="h-11 text-base" placeholder="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            <Input className="h-11 text-base" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input className="h-11 text-base sm:col-span-2" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <Button className="w-full sm:w-auto h-11" onClick={() => addDriver.mutate()} disabled={addDriver.isPending}>Add driver</Button>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium">Import</h2>
          <p className="text-xs text-muted-foreground">One driver per line: first name, last name, department, email, phone</p>
          <Textarea className="text-base" value={importText} onChange={(event) => setImportText(event.target.value)} rows={5} data-testid="input-driver-import" />
          <Button className="w-full sm:w-auto h-11" variant="outline" onClick={() => importDrivers.mutate()} disabled={importDrivers.isPending || !importText.trim()}>
            Import list
          </Button>
        </section>
      </div>

      {message && <p className="text-sm">{message}</p>}

      <div className="space-y-3">
        <Input placeholder="Search drivers" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full text-base sm:max-w-sm" />
        <div className="rounded-lg border divide-y">
          {(driversQuery.data ?? []).map((driver) => (
            <button
              key={driver.id}
              type="button"
              className="w-full min-h-11 text-left px-4 py-3 hover:bg-muted/40"
              onClick={() => setSelectedId(driver.id)}
            >
              <span className="font-medium break-words">{driver.firstName} {driver.lastName}</span>
              <span className="block text-sm text-muted-foreground">
                {driver.department || "No department"} · {driver.status}
                {driver.activePenalty ? " · penalty" : ""}
              </span>
            </button>
          ))}
          {driversQuery.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No drivers yet.</p>}
        </div>
      </div>

      {detailQuery.data && (
        <section className="rounded-lg border p-4 space-y-4" data-testid="driver-detail">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold break-words">{detailQuery.data.firstName} {detailQuery.data.lastName}</h2>
              <p className="text-sm text-muted-foreground break-all">{detailQuery.data.email || "No email"} · {detailQuery.data.phone || "No phone"}</p>
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-11 shrink-0"
              onClick={() => setStatus.mutate(detailQuery.data.status === "active" ? "inactive" : "active")}
            >
              {detailQuery.data.status === "active" ? "Mark inactive" : "Mark active"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Penalty</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 w-full sm:w-auto text-base rounded-md border bg-background px-3">
                {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <Input placeholder="Note" value={penaltyNote} onChange={(event) => setPenaltyNote(event.target.value)} className="h-11 w-full sm:max-w-xs text-base" />
              <Button variant="outline" className="w-full sm:w-auto h-11" onClick={() => addPenalty.mutate()}>Apply penalty</Button>
            </div>
            {detailQuery.data.penalties.map((penalty) => (
              <div key={penalty.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm border rounded-md px-3 py-2">
                <span className="break-words">{penalty.reason.replaceAll("_", " ")}{penalty.clearedAt ? " · cleared" : " · active"}</span>
                {!penalty.clearedAt && (
                  <Button size="sm" variant="ghost" className="h-10 self-start sm:self-auto" onClick={() => clearPenalty.mutate(penalty.id)}>Clear</Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Trips</h3>
            {detailQuery.data.reservations.length === 0 && <p className="text-sm text-muted-foreground">No trips yet.</p>}
            {detailQuery.data.reservations.map((reservation) => (
              <p key={reservation.id} className="text-sm">
                {reservation.status} · {reservation.purpose}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
