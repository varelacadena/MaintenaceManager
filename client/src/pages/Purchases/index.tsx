import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, Receipt } from "lucide-react";
import type { PurchaseLinkKind, PurchasePurpose, PurchaseView } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function refundedAmount(row: PurchaseView): number {
  return (row.refunds ?? []).reduce((sum, refund) => sum + (Number(refund.amount) || 0), 0);
}

function refundLeft(row: PurchaseView): number {
  return Math.round((Number(row.amount) - refundedAmount(row)) * 100) / 100;
}

function RefundLines({ row }: { row: PurchaseView }) {
  if (!row.refunds?.length) return null;
  return (
    <>
      {row.refunds.map((refund) => (
        <p key={refund.id} className="text-xs text-muted-foreground break-words">
          Refund −${Number(refund.amount).toFixed(2)} · {showDay(String(refund.refundedOn).slice(0, 10))}
          {refund.note ? ` · ${refund.note}` : ""}
        </p>
      ))}
    </>
  );
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

const compactCalendar = {
  months: "flex flex-col",
  month: "space-y-1",
  caption: "relative flex h-7 items-center justify-center",
  caption_label: "text-sm font-medium",
  nav: "flex items-center",
  nav_button: "inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-transparent p-0 opacity-70 hover:opacity-100",
  nav_button_previous: "absolute left-0",
  nav_button_next: "absolute right-0",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell: "w-7 text-[10px] font-medium text-muted-foreground",
  row: "mt-0.5 flex w-full",
  cell: "relative h-7 w-7 p-0 text-center text-xs",
  day: "inline-flex h-7 w-7 items-center justify-center rounded-md p-0 text-xs font-normal hover:bg-accent",
  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
  day_today: "border border-primary/40",
  day_outside: "text-muted-foreground/40",
};

function PeriodDate({
  id,
  label,
  value,
  onChange,
  wide = false,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  wide?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" disabled={disabled} className={wide ? "h-11 min-h-11 w-full max-w-full justify-start gap-2 px-3 py-0 text-base font-normal" : "h-9 min-h-9 w-full max-w-full justify-start gap-1.5 px-2 py-0 text-sm font-normal"}>
            <CalendarIcon className={wide ? "h-4 w-4 shrink-0 text-muted-foreground" : "h-3.5 w-3.5 shrink-0 text-muted-foreground"} />
            <span>{selected ? format(selected, "M/d/yy") : wide ? "Pick a date" : "Any"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={12} className="w-auto p-2">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              window.setTimeout(() => setOpen(false), 0);
            }}
            className="p-0"
            classNames={compactCalendar}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function keepFocus(event: { key: string; preventDefault: () => void }) {
  if (event.key === "Enter") event.preventDefault();
}

function ReceiptLines({ form, setForm, disabled = false }: { form: FormState; setForm: (next: FormState) => void; disabled?: boolean }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-store">Store</Label>
        <Input id="purchase-store" value={form.storeName} disabled={disabled} onChange={(event) => setForm({ ...form, storeName: event.target.value })} className="h-11 text-base" data-testid="input-purchase-store" />
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <PeriodDate id="purchase-date" label="Date" value={form.purchasedOn} onChange={(purchasedOn) => setForm({ ...form, purchasedOn })} wide disabled={disabled} />
        <div className="space-y-1.5">
          <Label htmlFor="purchase-amount">Amount paid</Label>
          <Input id="purchase-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} disabled={disabled} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-11 text-base" data-testid="input-purchase-amount" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-item">What you bought</Label>
        <Input id="purchase-item" value={form.description} disabled={disabled} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-11 text-base" data-testid="input-purchase-item" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="purchase-po">PO</Label>
        <Input id="purchase-po" value={form.poNumber} disabled={disabled} onChange={(event) => setForm({ ...form, poNumber: event.target.value })} placeholder="PO-1042" className="h-11 text-base" data-testid="input-purchase-po" />
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
  const canChange = (row: PurchaseView) => isAdmin || (!!user?.id && row.createdById === user.id);
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
  const locked = !!editing && !canChange(editing);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<ReceiptPayload | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<PurchaseLinkKind>("task");
  const [linkQuery, setLinkQuery] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [techId, setTechId] = useState("");
  const [jobPropertyId, setJobPropertyId] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<JobHit[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundQuery, setRefundQuery] = useState("");
  const [appliedRefundQuery, setAppliedRefundQuery] = useState("");
  const [refundPick, setRefundPick] = useState<PurchaseView | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundDate, setRefundDate] = useState(todayInput);
  const [refundNote, setRefundNote] = useState("");

  const query = new URLSearchParams();
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);
  if (propertyId) query.set("propertyId", propertyId);
  if (appliedSearch) query.set("q", appliedSearch);
  const queryString = query.toString();

  const { data: rows = [], isLoading } = useQuery<PurchaseView[]>({
    queryKey: ["/api/purchases", startDate, endDate, propertyId, appliedSearch],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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

  const { data: refundChoices = [], isFetching: refundChoicesLoading } = useQuery<PurchaseView[]>({
    queryKey: ["/api/purchases", "refund-choices", appliedRefundQuery],
    enabled: refundOpen && !refundPick,
    staleTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedRefundQuery) params.set("q", appliedRefundQuery);
      const response = await fetch(`/api/purchases${params.toString() ? `?${params}` : ""}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load receipts");
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
  const buildingName = buildingOptions.find((property) => property.id === propertyId)?.name;

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedRefundQuery(refundQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [refundQuery]);

  useEffect(() => {
    if (!open && !filtersOpen && !refundOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, filtersOpen, refundOpen]);

  const refunded = useMemo(() => rows.reduce((sum, row) => sum + refundedAmount(row), 0), [rows]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) - refunded, [rows, refunded]);
  const receipts = rows.filter((row) => row.hasReceipt).length;
  const links = editing?.links ?? [];

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
    setLinkTarget("");
    setStep(1);
    setTechId("");
    setJobPropertyId("");
    setJobQuery("");
    setSelectedJobs([]);
  };

  const closeRefund = () => {
    setRefundOpen(false);
    setRefundQuery("");
    setAppliedRefundQuery("");
    setRefundPick(null);
    setRefundAmount("");
    setRefundDate(todayInput());
    setRefundNote("");
  };

  const openRefund = (preset?: PurchaseView) => {
    setRefundPick(preset ?? null);
    setRefundQuery("");
    setAppliedRefundQuery("");
    setRefundAmount("");
    setRefundDate(todayInput());
    setRefundNote("");
    setRefundOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFile(null);
    setFileLabel("");
    setReadNote(null);
    setStep(1);
    setTechId("");
    setJobPropertyId("");
    setJobQuery("");
    setSelectedJobs([]);
    setOpen(true);
  };

  const toggleJob = (job: JobHit) => {
    setSelectedJobs((current) => {
      if (current.some((item) => item.id === job.id)) {
        return current.filter((item) => item.id !== job.id);
      }
      if (current.length >= 12) return current;
      return [...current, job];
    });
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
      const problem = detailsProblem(form);
      if (problem) throw new Error(problem);
      if (editing && !canChange(editing)) throw new Error("You can look at this receipt, but only the person who added it can change it");
      if (!editing && !file) throw new Error("Add a photo or PDF of the receipt");
      if (editing && form.removeReceipt && !isAdmin) throw new Error("Keep the receipt, or ask an admin to remove it");
      const body: Record<string, unknown> = {
        storeName: form.storeName.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
        purchasedOn: form.purchasedOn,
        poNumber: form.poNumber.trim(),
        purpose: form.purpose || null,
        purposeNote: form.purposeNote.trim() || null,
      };
      if (file) body.receipt = file;
      else if (editing && form.removeReceipt) body.receipt = null;
      if (!editing) {
        body.links = selectedJobs.map((job) => ({ kind: "task", targetId: job.id }));
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

  const saveRefund = useMutation({
    mutationFn: async () => {
      if (!refundPick) throw new Error("Choose the receipt");
      const amount = Number(refundAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter the refund amount");
      const left = refundLeft(refundPick);
      if (Math.round(amount * 100) > Math.round(left * 100)) throw new Error(`The most you can refund is $${left.toFixed(2)}`);
      if (!refundDate) throw new Error("Enter the refund date");
      const response = await apiRequest("POST", `/api/purchases/${refundPick.id}/refunds`, {
        amount,
        refundedOn: refundDate,
        note: refundNote.trim() || undefined,
      });
      return response.json() as Promise<PurchaseView>;
    },
    onSuccess: (view: PurchaseView) => {
      refresh();
      setEditing((current) => (current?.id === view.id ? view : current));
      closeRefund();
      toast({ title: "Refund saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save refund", description: error.message, variant: "destructive" });
    },
  });

  const removeRefund = useMutation({
    mutationFn: async (refundId: string) => {
      if (!editing) throw new Error("Open the receipt first");
      const response = await apiRequest("DELETE", `/api/purchases/${editing.id}/refunds/${refundId}`);
      return response.json() as Promise<PurchaseView>;
    },
    onSuccess: (view: PurchaseView) => {
      refresh();
      setEditing(view);
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove refund", description: error.message, variant: "destructive" });
    },
  });

  const addLink = async () => {
    if (!editing) return;
    const option = options.find((item) => item.id === linkTarget);
    if (!option) return;
    try {
      const response = await apiRequest("POST", `/api/purchases/${editing.id}/links`, { kind: linkKind, targetId: option.id });
      const next = (await response.json()) as PurchaseView;
      setEditing(next);
      refresh();
      setLinkTarget("");
    } catch (error) {
      toast({ title: "Could not add link", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
    }
  };

  const removeLink = async (linkId: string) => {
    if (!editing) return;
    try {
      const response = await apiRequest("DELETE", `/api/purchases/${editing.id}/links/${linkId}`);
      setEditing((await response.json()) as PurchaseView);
      refresh();
    } catch (error) {
      toast({ title: "Could not remove link", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
    }
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

      <section data-testid="section-add-receipt">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" className="h-11" onClick={openCreate} data-testid="button-add-purchase">Add receipt</Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => openRefund()} data-testid="button-add-refund">Add refund</Button>
        </div>
      </section>

      <section className="space-y-3" data-testid="section-find-receipt">
        <div className="grid grid-cols-2 gap-2">
          <PeriodDate id="purchase-from" label="From" value={startDate} onChange={setStartDate} />
          <PeriodDate id="purchase-to" label="To" value={endDate} onChange={setEndDate} />
          <Button type="button" variant="outline" className="col-span-2 h-9 min-h-9 w-full px-3 py-0" onClick={() => setFiltersOpen(true)} data-testid="button-purchase-filters">
            {buildingName ? "Filters · 1" : "Filters"}
          </Button>
        </div>
        <Input
          id="purchase-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Store, job, or amount"
          className="h-11 text-base"
          aria-label="Search receipts"
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <p>
            <span className="font-medium" data-testid="text-purchase-count">{rows.length}</span>
            <span className="text-muted-foreground"> purchases · </span>
            <span className="font-medium" data-testid="text-purchase-total">${total.toFixed(2)}</span>
            {refunded > 0 && (
              <span className="text-muted-foreground"> · ${refunded.toFixed(2)} refunded</span>
            )}
            {receipts !== rows.length && (
              <span className="text-muted-foreground"> · {receipts} with a photo</span>
            )}
          </p>
          {isAdmin && (
            <p className="flex gap-3">
              <button type="button" className="text-primary underline disabled:opacity-50" disabled={busy !== null} onClick={() => download("csv")} data-testid="button-download-purchases">
                {busy === "csv" ? "Downloading..." : "Spreadsheet"}
              </button>
              <button type="button" className="text-primary underline disabled:opacity-50" disabled={busy !== null || isLoading || receipts === 0} onClick={() => download("zip")} data-testid="button-download-receipts">
                {busy === "zip" ? "Downloading..." : "Receipt files"}
              </button>
            </p>
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
                  <RefundLines row={row} />
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
                    <td className="px-3 py-2">
                      <p>{row.description}</p>
                      <RefundLines row={row} />
                    </td>
                    <td className="px-3 py-2">{whereText(row)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">${Number(row.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" data-testid="dialog-purchase-filters">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
          <div className="relative z-10 w-full space-y-3 rounded-t-2xl bg-background p-4 sm:max-w-sm sm:rounded-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-medium">Filters</p>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setFiltersOpen(false)}>Done</Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase-building">Building</Label>
              <select
                id="purchase-building"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                <option value="">All buildings</option>
                {buildingOptions.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </div>
            {propertyId && (
              <button type="button" className="text-sm text-primary underline" onClick={() => setPropertyId("")}>
                Clear building
              </button>
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center" data-testid="dialog-purchase">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close receipt" onClick={close} />
          <div className="relative z-10 flex h-full max-h-full w-full flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] sm:h-auto sm:max-h-[min(92dvh,44rem)] sm:max-w-lg sm:rounded-xl sm:pt-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-base font-medium">{editing ? "Receipt" : step === 1 ? "Scan the receipt" : step === 2 ? "Check the lines" : "Link to jobs"}</p>
                {!editing && <p className="text-xs text-muted-foreground">Step {step} of 3</p>}
              </div>
              <Button type="button" variant="ghost" className="h-11" onClick={close}>Close</Button>
            </div>
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                if (!editing && step !== 3) return;
                saveMutation.mutate();
              }}
            >
              <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
                {(!editing && step === 1) || editing ? (
                  <>
                    {!editing && (
                      <p className="text-sm text-muted-foreground">Take a photo or choose a file. The picture is saved, then the store, date, and amount are filled in for you to check.</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" className="h-11" disabled={reading || locked} onClick={() => cameraRef.current?.click()} data-testid="button-take-receipt-photo">Take photo</Button>
                      <Button type="button" variant="outline" className="h-11" disabled={reading || locked} onClick={() => fileRef.current?.click()} data-testid="button-upload-receipt">Upload file</Button>
                    </div>
                    {!editing && file && (
                      <Button type="button" className="h-11 w-full" onClick={() => setStep(2)} data-testid="button-receipt-use-photo">Continue</Button>
                    )}
                  </>
                ) : null}
                {!editing && step === 2 && (
                  <div className="grid grid-cols-2 gap-2">
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
                )}
                {!editing && step === 3 && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-11 shrink-0 px-3" onClick={() => setStep(2)}>Back</Button>
                    <Button type="submit" className="h-11 min-w-0 flex-1 px-3" disabled={saveMutation.isPending} data-testid="button-save-purchase">
                      {saveMutation.isPending ? "Saving..." : selectedJobs.length > 0 ? `Save · ${selectedJobs.length} ${selectedJobs.length === 1 ? "job" : "jobs"}` : "Save with no job"}
                    </Button>
                  </div>
                )}
                {editing && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="submit" className={canChange(editing) ? "h-11" : "col-span-2 h-11"} disabled={saveMutation.isPending || reading || !canChange(editing)} data-testid="button-save-purchase">
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
                )}
                {reading && <p className="text-sm text-muted-foreground">{editing ? "Reading the receipt..." : "Saving and reading the receipt..."}</p>}
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {!editing && step === 2 && (
                <>
                  <p className="text-sm text-muted-foreground" data-testid="text-receipt-saved">Receipt saved. Check these lines, then add the PO and what you bought.</p>
                  {fileLabel && <p className="text-xs text-muted-foreground break-all">{fileLabel}</p>}
                  {readNote && <p className="text-xs text-muted-foreground">{readNote}</p>}
                  <ReceiptLines form={form} setForm={setForm} />
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
                    <Label htmlFor="job-search">Jobs</Label>
                    <p className="text-xs text-muted-foreground">Select every job this receipt covers. One receipt can be on more than one job.</p>
                    <Input
                      id="job-search"
                      value={jobQuery}
                      onChange={(event) => setJobQuery(event.target.value)}
                      placeholder="Type a job from the work page"
                      className="h-11 text-base"
                      data-testid="input-job-search"
                      onKeyDown={keepFocus}
                    />
                  </div>
                  {selectedJobs.length > 0 && (
                    <div className="flex flex-wrap gap-2" data-testid="text-selected-job">
                      {selectedJobs.map((job) => (
                        <span key={job.id} className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
                          <span className="break-words">{job.name}</span>
                          <button type="button" className="text-muted-foreground underline" onClick={() => toggleJob(job)}>Remove</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <ul className="max-h-52 space-y-1 overflow-y-auto">
                    {(jobSearch?.jobs ?? []).map((job) => {
                      const picked = selectedJobs.some((item) => item.id === job.id);
                      return (
                      <li key={job.id}>
                        <button
                          type="button"
                          className={`w-full rounded-md border px-3 py-2 text-left ${picked ? "border-primary bg-primary/5" : "border-border"}`}
                          aria-pressed={picked}
                          onClick={() => {
                            if (!picked && selectedJobs.length >= 12) {
                              toast({ title: "A receipt can be linked to 12 jobs", variant: "destructive" });
                              return;
                            }
                            toggleJob(job);
                          }}
                        >
                          <span className="block text-sm font-medium break-words">{picked ? "Selected · " : ""}{job.name}</span>
                          <span className="block text-xs text-muted-foreground break-words">
                            {[job.technicianName, job.propertyName].filter(Boolean).join(" · ") || "No technician or property"}
                          </span>
                        </button>
                      </li>
                      );
                    })}
                    {jobSearch && jobSearch.jobs.length === 0 && (
                      <li className="text-sm text-muted-foreground">No jobs match. Leave both lists on All to search every job, or save with no job.</li>
                    )}
                  </ul>
                </>
              )}
              {editing && (
                <>
                  <ReceiptLines form={form} setForm={setForm} disabled={locked} />
                  <div className="space-y-1.5">
                    {fileLabel && <p className="text-xs text-muted-foreground break-all">{fileLabel}</p>}
                    {readNote && <p className="text-xs text-muted-foreground">{readNote}</p>}
                    {editing.receiptObjectPath && !file && (
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={`/api/purchases/${editing.id}/receipt`} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{editing.receiptFileName || "Open receipt"}</a>
                        <Button type="button" variant="outline" className="h-9" disabled={reading || locked} onClick={() => void readExisting()}>Read receipt</Button>
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
                      disabled={locked}
                    >
                      <option value="">No extra label</option>
                      <option value="shop_stock">Shop stock</option>
                      <option value="general">General</option>
                    </select>
                    {form.purpose && (
                      <Input value={form.purposeNote} disabled={locked} onChange={(event) => setForm({ ...form, purposeNote: event.target.value })} placeholder="Short note" className="h-11 text-base" />
                    )}
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Refunds</p>
                      <Button type="button" variant="outline" className="h-9" onClick={() => openRefund(editing)} disabled={refundLeft(editing) <= 0}>
                        Add refund
                      </Button>
                    </div>
                    {(editing.refunds ?? []).length === 0 && <p className="text-sm text-muted-foreground">No refund on this receipt.</p>}
                    {(editing.refunds ?? []).map((refund) => (
                      <div key={refund.id} className="flex items-start justify-between gap-3 text-sm">
                        <p className="min-w-0 break-words">
                          −${Number(refund.amount).toFixed(2)} · {showDay(String(refund.refundedOn).slice(0, 10))}
                          {refund.note ? ` · ${refund.note}` : ""}
                        </p>
                        {(isAdmin || refund.createdById === user?.id) && (
                          <button type="button" className="shrink-0 text-muted-foreground underline" disabled={removeRefund.isPending} onClick={() => removeRefund.mutate(refund.id)}>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-sm font-medium">Linked to</p>
                    <p className="text-xs text-muted-foreground">Add each job this receipt covers. One receipt can stay linked to more than one job.</p>
                    <div className="flex flex-wrap gap-2">
                      {links.length === 0 && <p className="text-sm text-muted-foreground">Nothing linked yet.</p>}
                      {links.map((link) => (
                        <span key={`${link.kind}-${link.targetId}`} className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
                          {kindLabel(link.kind)}: {link.label}
                          <button type="button" className="text-muted-foreground" onClick={() => void removeLink(link.id)} aria-label="Remove link">Remove</button>
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
                      <Input value={linkQuery} onChange={(event) => setLinkQuery(event.target.value)} onKeyDown={keepFocus} placeholder="Filter the list" className="h-11 text-base" aria-label="Filter links" />
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
                </>
              )}
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
            </form>
          </div>
        </div>
      )}

      {refundOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center sm:items-center" data-testid="dialog-refund">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close refund" onClick={closeRefund} />
          <div className="relative z-10 flex h-full max-h-full w-full flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] sm:h-auto sm:max-h-[min(92dvh,40rem)] sm:max-w-lg sm:rounded-xl sm:pt-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-base font-medium">Add refund</p>
              <Button type="button" variant="ghost" className="h-11" onClick={closeRefund}>Close</Button>
            </div>
            {refundPick ? (
              <form
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveRefund.mutate();
                }}
              >
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <Button type="submit" className="h-11 w-full" disabled={saveRefund.isPending} data-testid="button-save-refund">
                    {saveRefund.isPending ? "Saving..." : "Save refund"}
                  </Button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  <div>
                    <p className="font-medium break-words">{refundPick.storeName}</p>
                    <p className="text-sm text-muted-foreground break-words">{refundPick.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid ${Number(refundPick.amount).toFixed(2)} · {showDay(String(refundPick.purchasedOn).slice(0, 10))}
                      {refundedAmount(refundPick) > 0 ? ` · already refunded $${refundedAmount(refundPick).toFixed(2)}` : ""}
                    </p>
                    <p className="text-sm">Up to ${refundLeft(refundPick).toFixed(2)} can still be refunded.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="refund-amount">Refund amount</Label>
                    <Input id="refund-amount" inputMode="decimal" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder="0.00" className="h-11 text-base" data-testid="input-refund-amount" />
                  </div>
                  <PeriodDate id="refund-date" label="Date" value={refundDate} onChange={setRefundDate} wide />
                  <div className="space-y-1.5">
                    <Label htmlFor="refund-note">What was returned</Label>
                    <Input id="refund-note" value={refundNote} onChange={(event) => setRefundNote(event.target.value)} placeholder="Optional" className="h-11 text-base" data-testid="input-refund-note" />
                  </div>
                  <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setRefundPick(null)}>Choose a different receipt</button>
                </div>
              </form>
            ) : (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <p className="text-sm text-muted-foreground">Pick the receipt this refund belongs to. The receipt amount stays the same, and the total comes down by the refund.</p>
                <Input
                  value={refundQuery}
                  onChange={(event) => setRefundQuery(event.target.value)}
                  placeholder="Store, PO, or what was bought"
                  className="h-11 text-base"
                  aria-label="Find a receipt to refund"
                  data-testid="input-refund-search"
                />
                {refundChoicesLoading && <p className="text-sm text-muted-foreground">Loading receipts...</p>}
                <ul className="space-y-2">
                  {refundChoices.filter((row) => refundLeft(row) > 0).slice(0, 20).map((row) => (
                    <li key={row.id}>
                      <button type="button" className="w-full rounded-lg border border-border px-3 py-2.5 text-left" onClick={() => setRefundPick(row)} data-testid={`refund-choice-${row.id}`}>
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-medium break-words">{row.storeName}</span>
                          <span className="shrink-0">${Number(row.amount).toFixed(2)}</span>
                        </span>
                        <span className="block text-sm text-muted-foreground break-words">{row.description}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.poNumber ? `${row.poNumber} · ` : ""}{showDay(String(row.purchasedOn).slice(0, 10))}
                          {refundedAmount(row) > 0 ? ` · $${refundLeft(row).toFixed(2)} left` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!refundChoicesLoading && refundChoices.filter((row) => refundLeft(row) > 0).length === 0 && (
                  <p className="text-sm text-muted-foreground">No receipt matches. Try the store, the PO, or what was bought.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
