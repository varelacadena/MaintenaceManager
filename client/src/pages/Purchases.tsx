import { useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { Receipt } from "lucide-react";
import type { PurchaseLinkKind, PurchasePurpose, PurchaseView } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { prepareReceipt, type ReceiptPayload, type ReceiptSuggestion } from "@/lib/purchaseReceipt";

const KINDS: { id: PurchaseLinkKind; label: string }[] = [
  { id: "task", label: "Job" },
  { id: "vehicle", label: "Vehicle" },
  { id: "equipment", label: "Equipment" },
  { id: "tool", label: "Tool" },
  { id: "property", label: "Property" },
  { id: "project", label: "Project" },
];

type DraftLink = { kind: PurchaseLinkKind; targetId: string; label: string };
type FormState = {
  storeName: string;
  description: string;
  amount: string;
  purchasedOn: string;
  poNumber: string;
  purpose: "" | PurchasePurpose;
  purposeNote: string;
  removeReceipt: boolean;
};

type JobHit = {
  id: string;
  name: string;
  technicianName: string | null;
  propertyName: string | null;
};

function todayInput(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function showDay(value: string): string {
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? format(parsed, "MMM d, yyyy") : value;
}

function emptyForm(): FormState {
  return {
    storeName: "",
    description: "",
    amount: "",
    purchasedOn: todayInput(),
    poNumber: "",
    purpose: "",
    purposeNote: "",
    removeReceipt: false,
  };
}

function kindLabel(kind: PurchaseLinkKind): string {
  return KINDS.find((item) => item.id === kind)?.label || kind;
}

function whereText(row: PurchaseView): string {
  const parts = row.links.map((link) => `${kindLabel(link.kind)}: ${link.label}`);
  if (row.purpose === "shop_stock") parts.push(row.purposeNote ? `Shop stock: ${row.purposeNote}` : "Shop stock");
  if (row.purpose === "general") parts.push(row.purposeNote ? `General: ${row.purposeNote}` : "General");
  return parts.join(" · ") || "Not linked";
}

function detailsProblem(form: FormState): string | null {
  const amount = Number(form.amount);
  if (!form.storeName.trim()) return "Enter the store";
  if (!form.description.trim()) return "Enter what was bought";
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount paid";
  if (!form.purchasedOn) return "Enter the purchase date";
  if (!form.poNumber.trim()) return "Enter the PO";
  return null;
}

function ReceiptLines({ form, setForm }: { form: FormState; setForm: (next: FormState) => void }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-store">Store</Label>
        <Input id="purchase-store" value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} className="h-11 text-base" data-testid="input-purchase-store" />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="purchase-date">Date</Label>
          <Input id="purchase-date" type="date" value={form.purchasedOn} onChange={(event) => setForm({ ...form, purchasedOn: event.target.value })} className="h-11 text-base" data-testid="input-purchase-date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchase-amount">Amount paid</Label>
          <Input id="purchase-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-11 text-base" data-testid="input-purchase-amount" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-item">What you bought</Label>
        <Input id="purchase-item" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-11 text-base" data-testid="input-purchase-item" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-po">PO</Label>
        <Input id="purchase-po" value={form.poNumber} onChange={(event) => setForm({ ...form, poNumber: event.target.value })} placeholder="PO-1042" className="h-11 text-base" data-testid="input-purchase-po" />
      </div>
    </>
  );
}

function applySuggestion(form: FormState, suggestion: ReceiptSuggestion): FormState {
  return {
    ...form,
    storeName: suggestion.storeName || form.storeName,
    purchasedOn: suggestion.purchasedOn || form.purchasedOn,
    amount: suggestion.amount != null ? suggestion.amount.toFixed(2) : form.amount,
  };
}

async function downloadExport(formatName: "csv" | "zip", query: string) {
  const params = new URLSearchParams(query);
  params.set("format", formatName);
  const response = await fetch(`/api/purchases/export?${params.toString()}`, { credentials: "include" });
  if (!response.ok) {
    let message = "Download failed";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* not json */
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? (formatName === "zip" ? "store-receipts.zip" : "store-purchases.csv");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Purchases() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [busy, setBusy] = useState<"csv" | "zip" | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseView | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<ReceiptPayload | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>([]);
  const [linkKind, setLinkKind] = useState<PurchaseLinkKind>("task");
  const [linkQuery, setLinkQuery] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [techId, setTechId] = useState("");
  const [jobPropertyId, setJobPropertyId] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobHit | null>(null);

  const query = new URLSearchParams();
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);
  if (propertyId) query.set("propertyId", propertyId);
  if (appliedSearch) query.set("q", appliedSearch);
  const queryString = query.toString();

  const { data: rows = [], isLoading } = useQuery<PurchaseView[]>({
    queryKey: ["/api/purchases", startDate, endDate, propertyId, appliedSearch],
    queryFn: async () => {
      const response = await fetch(`/api/purchases${queryString ? `?${queryString}` : ""}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load purchases");
      return response.json();
    },
  });

  const { data: properties = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/properties"],
  });

  const { data: options = [] } = useQuery<{ id: string; label: string }[]>({
    queryKey: ["/api/purchases/options", linkKind, linkQuery],
    enabled: open && !!editing,
    queryFn: async () => {
      const params = new URLSearchParams({ kind: linkKind, q: linkQuery });
      const response = await fetch(`/api/purchases/options?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load records");
      return response.json();
    },
  });

  const { data: jobSearch } = useQuery<{
    technicians: { id: string; name: string }[];
    properties: { id: string; name: string }[];
    jobs: JobHit[];
  }>({
    queryKey: ["/api/purchases/jobs", techId, jobPropertyId, jobQuery],
    enabled: open && !editing && step === 3,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (techId) params.set("technicianId", techId);
      if (jobPropertyId) params.set("propertyId", jobPropertyId);
      if (jobQuery.trim()) params.set("q", jobQuery.trim());
      const response = await fetch(`/api/purchases/jobs?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load jobs");
      return response.json();
    },
  });

  const buildingOptions = useMemo(
    () => [...properties].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [properties],
  );
  const total = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [rows]);
  const receipts = rows.filter((row) => row.hasReceipt).length;
  const links = editing ? editing.links.map((link) => ({ kind: link.kind, targetId: link.targetId, label: link.label, id: link.id })) : draftLinks;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setFile(null);
    setFileLabel("");
    setReadNote(null);
    setDraftLinks([]);
    setLinkTarget("");
    setStep(1);
    setTechId("");
    setJobPropertyId("");
    setJobQuery("");
    setSelectedJob(null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFile(null);
    setFileLabel("");
    setReadNote(null);
    setDraftLinks([]);
    setStep(1);
    setTechId("");
    setJobPropertyId("");
    setJobQuery("");
    setSelectedJob(null);
    setOpen(true);
  };

  const openEdit = (row: PurchaseView) => {
    setEditing(row);
    setForm({
      storeName: row.storeName,
      description: row.description,
      amount: String(row.amount),
      purchasedOn: row.purchasedOn,
      poNumber: row.poNumber || "",
      purpose: row.purpose === "shop_stock" || row.purpose === "general" ? row.purpose : "",
      purposeNote: row.purposeNote || "",
      removeReceipt: false,
    });
    setFile(null);
    setFileLabel("");
    setReadNote(null);
    setOpen(true);
  };

  const onFile = async (list: FileList | null) => {
    const next = list?.[0];
    if (!next) return;
    setReading(true);
    setReadNote(null);
    try {
      const prepared = await prepareReceipt(next);
      setFile(prepared.receipt);
      setFileLabel(next.name);
      setForm((current) => ({
        ...(prepared.suggestion ? applySuggestion(current, prepared.suggestion) : current),
        removeReceipt: false,
      }));
      setReadNote(prepared.suggestion?.message || prepared.warning);
      if (!editing) setStep(2);
    } catch (error) {
      toast({
        title: "Could not add the receipt",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setReading(false);
    }
  };

  const readExisting = async () => {
    if (!editing) return;
    setReading(true);
    try {
      const response = await apiRequest("POST", `/api/purchases/${editing.id}/read`);
      const suggestion = (await response.json()) as ReceiptSuggestion;
      setForm((current) => applySuggestion(current, suggestion));
      setReadNote(suggestion.message);
    } catch (error) {
      toast({
        title: "Could not read the receipt",
        description: error instanceof Error ? error.message : "Enter the store, date, and amount.",
        variant: "destructive",
      });
    } finally {
      setReading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!form.storeName.trim()) throw new Error("Enter the store");
      if (!form.description.trim()) throw new Error("Enter what was bought");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter the amount paid");
      if (!form.purchasedOn) throw new Error("Enter the purchase date");
      if (!form.poNumber.trim()) throw new Error("Enter the PO");
      if (!editing && !file) throw new Error("Add a photo or PDF of the receipt");
      if (editing && form.removeReceipt && !isAdmin) throw new Error("Keep the receipt, or ask an admin to remove it");
      const body: Record<string, unknown> = {
        storeName: form.storeName.trim(),
        description: form.description.trim(),
        amount,
        purchasedOn: form.purchasedOn,
        poNumber: form.poNumber.trim(),
        purpose: form.purpose || null,
        purposeNote: form.purposeNote.trim() || null,
      };
      if (file) body.receipt = file;
      else if (editing && form.removeReceipt) body.receipt = null;
      if (!editing) {
        body.links = selectedJob ? [{ kind: "task", targetId: selectedJob.id }] : [];
        const response = await apiRequest("POST", "/api/purchases", body);
        return response.json();
      }
      const response = await apiRequest("PATCH", `/api/purchases/${editing.id}`, body);
      return response.json();
    },
    onSuccess: () => {
      refresh();
      close();
    },
    onError: (error: Error) => {
      toast({ title: "Could not save receipt", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchases/${id}`);
    },
    onSuccess: () => {
      refresh();
      close();
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete receipt", description: error.message, variant: "destructive" });
    },
  });

  const addLink = async () => {
    const option = options.find((item) => item.id === linkTarget);
    if (!option) return;
    if (editing) {
      try {
        const response = await apiRequest("POST", `/api/purchases/${editing.id}/links`, { kind: linkKind, targetId: option.id });
        const next = (await response.json()) as PurchaseView;
        setEditing(next);
        refresh();
        setLinkTarget("");
      } catch (error) {
        toast({ title: "Could not add link", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
      }
      return;
    }
    if (draftLinks.some((link) => link.kind === linkKind && link.targetId === option.id)) return;
    setDraftLinks([...draftLinks, { kind: linkKind, targetId: option.id, label: option.label }]);
    setLinkTarget("");
  };

  const removeLink = async (link: { id?: string; kind: PurchaseLinkKind; targetId: string }) => {
    if (editing && link.id) {
      try {
        const response = await apiRequest("DELETE", `/api/purchases/${editing.id}/links/${link.id}`);
        setEditing((await response.json()) as PurchaseView);
        refresh();
      } catch (error) {
        toast({ title: "Could not remove link", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
      }
      return;
    }
    setDraftLinks(draftLinks.filter((item) => !(item.kind === link.kind && item.targetId === link.targetId)));
  };

  const download = async (formatName: "csv" | "zip") => {
    setBusy(formatName);
    try {
      await downloadExport(formatName, queryString);
    } catch (error) {
      toast({
        title: formatName === "zip" ? "Could not download receipts" : "Could not download spreadsheet",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const canChange = (row: PurchaseView) => isAdmin || (!!user?.id && row.createdById === user.id);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 md:p-6" data-testid="page-purchases">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Purchases</h1>
          <p className="text-sm text-muted-foreground">Receipts from jobs and everything else. Each receipt is counted once.</p>
        </div>
      </div>

      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(search.trim());
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="purchase-from">From</Label>
          <Input id="purchase-from" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-11 text-base md:h-9 md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchase-to">To</Label>
          <Input id="purchase-to" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-11 text-base md:h-9 md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchase-building">Building</Label>
          <select
            id="purchase-building"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base md:h-9 md:text-sm"
          >
            <option value="">All buildings</option>
            {buildingOptions.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchase-search">Search</Label>
          <Input id="purchase-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Store, job, vehicle" className="h-11 text-base md:h-9 md:text-sm" />
        </div>
      </form>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <p><span className="text-muted-foreground">Purchases </span><span className="font-medium" data-testid="text-purchase-count">{rows.length}</span></p>
        <p><span className="text-muted-foreground">Spent </span><span className="font-medium" data-testid="text-purchase-total">${total.toFixed(2)}</span></p>
        <p><span className="text-muted-foreground">Receipts </span><span className="font-medium">{receipts}</span></p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" className="h-11 sm:h-9" onClick={openCreate} data-testid="button-add-purchase">Add receipt</Button>
        <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setAppliedSearch(search.trim())}>Search</Button>
        {isAdmin && (
          <>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy !== null} onClick={() => download("csv")} data-testid="button-download-purchases">
              {busy === "csv" ? "Downloading..." : "Download spreadsheet"}
            </Button>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy !== null || isLoading || receipts === 0} onClick={() => download("zip")} data-testid="button-download-receipts">
              {busy === "zip" ? "Downloading..." : "Download receipts"}
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading purchases...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No receipts in this period. Add one here, or add a store run on a job.</p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" className="w-full rounded-lg border border-border px-3 py-3 text-left" onClick={() => openEdit(row)}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium break-words">{row.storeName}</p>
                    <p className="shrink-0 font-medium">${Number(row.amount).toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{row.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.poNumber ? `${row.poNumber} · ` : ""}{showDay(row.purchasedOn)} · {whereText(row)}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">PO</th>
                  <th className="px-3 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">What was bought</th>
                  <th className="px-3 py-2 font-medium">Linked to</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2">{showDay(row.purchasedOn)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.poNumber || ""}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="text-left underline" onClick={() => openEdit(row)}>{row.storeName}</button>
                    </td>
                    <td className="px-3 py-2">{row.description}</td>
                    <td className="px-3 py-2">{whereText(row)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">${Number(row.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" data-testid="dialog-purchase">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close receipt" onClick={close} />
          <div className="relative z-10 flex max-h-[min(92dvh,44rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-background sm:max-w-lg sm:rounded-xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-base font-medium">{editing ? "Receipt" : step === 1 ? "Scan the receipt" : step === 2 ? "Check the lines" : "Link to a job"}</p>
                {!editing && <p className="text-xs text-muted-foreground">Step {step} of 3</p>}
              </div>
              <Button type="button" variant="ghost" className="h-11" onClick={close}>Close</Button>
            </div>
            <form
              className="space-y-3 overflow-y-auto px-4 py-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!editing && step !== 3) return;
                saveMutation.mutate();
              }}
            >
              {!editing && step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Take a photo or choose a file. The picture is saved, then the store, date, and amount are filled in for you to check.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="h-11" disabled={reading} onClick={() => cameraRef.current?.click()} data-testid="button-take-receipt-photo">Take photo</Button>
                    <Button type="button" variant="outline" className="h-11" disabled={reading} onClick={() => fileRef.current?.click()} data-testid="button-upload-receipt">Upload file</Button>
                  </div>
                  {reading && <p className="text-sm text-muted-foreground">Saving and reading the receipt...</p>}
                </div>
              )}
              {!editing && step === 2 && (
                <>
                  <p className="text-sm text-muted-foreground" data-testid="text-receipt-saved">Receipt saved. Check these lines, then add the PO and what you bought.</p>
                  {fileLabel && <p className="text-xs text-muted-foreground break-all">{fileLabel}</p>}
                  {readNote && <p className="text-xs text-muted-foreground">{readNote}</p>}
                  <ReceiptLines form={form} setForm={setForm} />
                  <div className="flex flex-col gap-2 pb-2 sm:flex-row">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setStep(1)}>Back</Button>
                    <Button
                      type="button"
                      className="h-11"
                      data-testid="button-receipt-continue"
                      onClick={() => {
                        const problem = detailsProblem(form);
                        if (problem) {
                          toast({ title: problem, variant: "destructive" });
                          return;
                        }
                        setStep(3);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </>
              )}
              {!editing && step === 3 && (
                <>
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="job-technician">Technician</Label>
                      <select
                        id="job-technician"
                        value={techId}
                        onChange={(event) => setTechId(event.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                        data-testid="select-job-technician"
                      >
                        <option value="">All</option>
                        {(jobSearch?.technicians ?? []).map((person) => (
                          <option key={person.id} value={person.id}>{person.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="job-property">Property</Label>
                      <select
                        id="job-property"
                        value={jobPropertyId}
                        onChange={(event) => setJobPropertyId(event.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                        data-testid="select-job-property"
                      >
                        <option value="">All</option>
                        {(jobSearch?.properties ?? []).map((property) => (
                          <option key={property.id} value={property.id}>{property.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="job-search">Job</Label>
                    <Input
                      id="job-search"
                      value={jobQuery}
                      onChange={(event) => setJobQuery(event.target.value)}
                      placeholder="Type a job from the work page"
                      className="h-11 text-base"
                      data-testid="input-job-search"
                    />
                  </div>
                  {selectedJob && (
                    <p className="text-sm" data-testid="text-selected-job">
                      Linked to {selectedJob.name}
                      <button type="button" className="ml-2 text-muted-foreground underline" onClick={() => setSelectedJob(null)}>Clear</button>
                    </p>
                  )}
                  <ul className="max-h-52 space-y-1 overflow-y-auto">
                    {(jobSearch?.jobs ?? []).map((job) => (
                      <li key={job.id}>
                        <button
                          type="button"
                          className="w-full rounded-md border border-border px-3 py-2 text-left"
                          onClick={() => setSelectedJob(job)}
                        >
                          <span className="block text-sm font-medium break-words">{job.name}</span>
                          <span className="block text-xs text-muted-foreground break-words">
                            {[job.technicianName, job.propertyName].filter(Boolean).join(" · ") || "No technician or property"}
                          </span>
                        </button>
                      </li>
                    ))}
                    {jobSearch && jobSearch.jobs.length === 0 && (
                      <li className="text-sm text-muted-foreground">No jobs match. Leave both lists on All to search every job, or save with no job.</li>
                    )}
                  </ul>
                  <div className="flex flex-col gap-2 pb-2 sm:flex-row">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setStep(2)}>Back</Button>
                    <Button type="submit" className="h-11" disabled={saveMutation.isPending} data-testid="button-save-purchase">
                      {saveMutation.isPending ? "Saving..." : selectedJob ? "Save" : "Save with no job"}
                    </Button>
                  </div>
                </>
              )}
              {editing && (
                <>
                  <ReceiptLines form={form} setForm={setForm} />
                  <div className="space-y-1.5">
                    <Label>Receipt</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" className="h-11" disabled={reading} onClick={() => cameraRef.current?.click()}>Take photo</Button>
                      <Button type="button" variant="outline" className="h-11" disabled={reading} onClick={() => fileRef.current?.click()}>Upload file</Button>
                    </div>
                    {reading && <p className="text-xs text-muted-foreground">Reading the receipt...</p>}
                    {fileLabel && <p className="text-xs text-muted-foreground break-all">{fileLabel}</p>}
                    {readNote && <p className="text-xs text-muted-foreground">{readNote}</p>}
                    {editing.receiptObjectPath && !file && (
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={`/api/purchases/${editing.id}/receipt`} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{editing.receiptFileName || "Open receipt"}</a>
                        <Button type="button" variant="outline" className="h-9" disabled={reading} onClick={() => void readExisting()}>Read receipt</Button>
                      </div>
                    )}
                    {isAdmin && editing.receiptObjectPath && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-5 w-5" checked={form.removeReceipt} onChange={(event) => setForm({ ...form, removeReceipt: event.target.checked })} />
                        Remove receipt
                      </label>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="purchase-purpose">If it is not a specific record</Label>
                    <select
                      id="purchase-purpose"
                      value={form.purpose}
                      onChange={(event) => setForm({ ...form, purpose: event.target.value as FormState["purpose"] })}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                    >
                      <option value="">No extra label</option>
                      <option value="shop_stock">Shop stock</option>
                      <option value="general">General</option>
                    </select>
                    {form.purpose && (
                      <Input value={form.purposeNote} onChange={(event) => setForm({ ...form, purposeNote: event.target.value })} placeholder="Short note" className="h-11 text-base" />
                    )}
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-sm font-medium">Linked to</p>
                    <div className="flex flex-wrap gap-2">
                      {links.length === 0 && <p className="text-sm text-muted-foreground">Nothing linked yet.</p>}
                      {links.map((link) => (
                        <span key={`${link.kind}-${link.targetId}`} className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
                          {kindLabel(link.kind)}: {link.label}
                          <button type="button" className="text-muted-foreground" onClick={() => void removeLink(link)} aria-label="Remove link">Remove</button>
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                      <select
                        value={linkKind}
                        onChange={(event) => {
                          setLinkKind(event.target.value as PurchaseLinkKind);
                          setLinkTarget("");
                        }}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                        aria-label="Link type"
                      >
                        {KINDS.map((kind) => (
                          <option key={kind.id} value={kind.id}>{kind.label}</option>
                        ))}
                      </select>
                      <Input value={linkQuery} onChange={(event) => setLinkQuery(event.target.value)} placeholder="Filter the list" className="h-11 text-base" aria-label="Filter links" />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={linkTarget}
                        onChange={(event) => setLinkTarget(event.target.value)}
                        className="flex h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base"
                        aria-label="Record to link"
                      >
                        <option value="">Choose</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => void addLink()}>Add</Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pb-2 sm:flex-row">
                    <Button type="submit" className="h-11" disabled={saveMutation.isPending || reading || !canChange(editing)} data-testid="button-save-purchase">
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    {canChange(editing) && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm("Delete this receipt?")) deleteMutation.mutate(editing.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
