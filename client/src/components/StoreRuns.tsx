import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { Camera, Check, ChevronRight, Receipt, Trash2, Upload } from "lucide-react";
import { Link } from "wouter";
import type { PurchaseView } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { prepareReceipt, type ReceiptPayload, type ReceiptSuggestion } from "@/lib/purchaseReceipt";
import { canManagePurchases } from "@shared/techPermissions";

type PurchaseBody = {
  storeName: string;
  description: string;
  amount: number;
  purchasedOn: string;
  poNumber: string;
  receipt?: ReceiptPayload | null;
  alsoTaskIds?: string[];
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

function emptyForm() {
  return {
    storeName: "",
    description: "",
    amount: "",
    purchasedOn: todayInput(),
    poNumber: "",
    removeReceipt: false,
  };
}

function applySuggestion<T extends { storeName: string; amount: string; purchasedOn: string }>(
  form: T,
  suggestion: ReceiptSuggestion,
): T {
  return {
    ...form,
    storeName: suggestion.storeName || form.storeName,
    purchasedOn: suggestion.purchasedOn || form.purchasedOn,
    amount: suggestion.amount != null ? suggestion.amount.toFixed(2) : form.amount,
  };
}

function storeRunGaps(
  form: ReturnType<typeof emptyForm>,
  needsReceipt: boolean,
): string[] {
  const gaps: string[] = [];
  if (needsReceipt) gaps.push("a receipt photo or file");
  if (!form.storeName.trim()) gaps.push("the store");
  if (!form.description.trim()) gaps.push("what you bought");
  if (!form.poNumber.trim()) gaps.push("the PO");
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) gaps.push("the amount");
  if (!form.purchasedOn) gaps.push("the date");
  return gaps;
}

function continueHint(gaps: string[]): string {
  if (gaps.length === 0) return "";
  if (gaps.length === 1) return `Add ${gaps[0]} to continue.`;
  const labels = gaps.map((gap) => gap.replace(/^(a|the) /, ""));
  return `Still needed: ${labels.join(", ")}.`;
}

export function StoreRunPanel({ taskId, pinSave = false }: { taskId: string; pinSave?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const canOpenPurchases = canManagePurchases(user);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<ReceiptPayload | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [find, setFind] = useState("");
  const [hits, setHits] = useState<PurchaseView[]>([]);
  const [jobQuery, setJobQuery] = useState("");
  const [extraJobs, setExtraJobs] = useState<JobHit[]>([]);

  const { data: purchases = [], isLoading } = useQuery<PurchaseView[]>({
    queryKey: ["/api/tasks", taskId, "purchases"],
    enabled: !!taskId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFile(null);
    setFileLabel("");
    setReadNote(null);
    setJobQuery("");
    setExtraJobs([]);
  };

  const { data: jobSearch } = useQuery<{ jobs: JobHit[] }>({
    queryKey: ["/api/purchases/jobs", "store-run", jobQuery],
    enabled: canOpenPurchases,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (jobQuery.trim()) params.set("q", jobQuery.trim());
      const response = await fetch(`/api/purchases/jobs?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load jobs");
      return response.json();
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "purchases"] });
    queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!form.storeName.trim()) throw new Error("Enter the store");
      if (!form.description.trim()) throw new Error("Enter what was bought");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter the amount paid");
      if (!form.purchasedOn) throw new Error("Enter the purchase date");
      if (!form.poNumber.trim()) throw new Error("Enter the PO");
      const editing = purchases.find((purchase) => purchase.id === editingId);
      if (!editing && !file) throw new Error("Add a photo or PDF of the receipt");
      if (editing && form.removeReceipt && !isAdmin) throw new Error("Keep the receipt, or ask an admin to remove it");

      const body: PurchaseBody = {
        storeName: form.storeName.trim(),
        description: form.description.trim(),
        amount,
        purchasedOn: form.purchasedOn,
        poNumber: form.poNumber.trim(),
      };
      if (file) body.receipt = file;
      else if (editing && form.removeReceipt) body.receipt = null;
      if (!editing && extraJobs.length > 0) body.alsoTaskIds = extraJobs.map((job) => job.id);

      if (editing) {
        const response = await apiRequest("PATCH", `/api/purchases/${editing.id}`, body);
        return response.json();
      }
      const response = await apiRequest("POST", `/api/tasks/${taskId}/purchases`, body);
      return response.json();
    },
    onSuccess: () => {
      refresh();
      reset();
    },
    onError: (error: Error) => {
      toast({ title: "Could not save store run", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (purchase: PurchaseView) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}/purchases/${purchase.id}`);
    },
    onSuccess: () => {
      refresh();
      reset();
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove store run", description: error.message, variant: "destructive" });
    },
  });

  const startEdit = (purchase: PurchaseView) => {
    setEditingId(purchase.id);
    setFile(null);
    setFileLabel("");
    setReadNote(null);
    setForm({
      storeName: purchase.storeName,
      description: purchase.description,
      amount: String(purchase.amount),
      purchasedOn: purchase.purchasedOn,
      poNumber: purchase.poNumber || "",
      removeReceipt: false,
    });
  };

  const canChange = (purchase: PurchaseView) =>
    isAdmin || (!!user?.id && purchase.createdById === user.id);

  const searchSaved = async () => {
    const query = find.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`/api/purchases?${params.toString()}`, { credentials: "include" });
    if (!response.ok) {
      toast({ title: "Could not search receipts", variant: "destructive" });
      return;
    }
    const rows = (await response.json()) as PurchaseView[];
    setHits(rows.filter((row) => !row.links.some((link) => link.kind === "task" && link.targetId === taskId)).slice(0, 6));
  };

  const attachMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      await apiRequest("POST", `/api/purchases/${purchaseId}/links`, { kind: "task", targetId: taskId });
    },
    onSuccess: () => {
      refresh();
      setHits([]);
      setFind("");
    },
    onError: (error: Error) => {
      toast({ title: "Could not attach receipt", description: error.message, variant: "destructive" });
    },
  });

  const addExtraJob = async (job: JobHit) => {
    if (job.id === taskId) return;
    if (!editingId) {
      setExtraJobs((current) => {
        if (current.some((item) => item.id === job.id)) return current.filter((item) => item.id !== job.id);
        if (current.length >= 11) return current;
        return [...current, job];
      });
      return;
    }
    const current = purchases.find((purchase) => purchase.id === editingId);
    if (current?.links.some((link) => link.kind === "task" && link.targetId === job.id)) return;
    try {
      await apiRequest("POST", `/api/purchases/${editingId}/links`, { kind: "task", targetId: job.id });
      refresh();
    } catch (error) {
      toast({ title: "Could not link job", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
    }
  };

  const removeExtraLink = async (purchaseId: string, linkId: string) => {
    try {
      await apiRequest("DELETE", `/api/purchases/${purchaseId}/links/${linkId}`);
      refresh();
    } catch (error) {
      toast({ title: "Could not remove job", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
    }
  };

  const editing = purchases.find((purchase) => purchase.id === editingId);
  const needsReceipt = !editingId && !file;
  const gaps = storeRunGaps(form, needsReceipt);
  const canSave = gaps.length === 0 && !saveMutation.isPending && !reading;
  const formId = `store-run-form-${taskId}`;
  const saveBar = (
    <div className={pinSave ? "shrink-0 space-y-2 border-t border-border bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4" : "space-y-2 border-t border-border pt-3"}>
      {!canSave && !saveMutation.isPending && !reading && (
        <p className="break-words text-xs text-muted-foreground" data-testid="text-store-run-locked">
          {continueHint(gaps)}
        </p>
      )}
      <div className="flex gap-2">
        {editingId && (
          <Button type="button" variant="outline" className="h-12" onClick={reset} data-testid="button-cancel-store-run">
            Cancel
          </Button>
        )}
        <Button type="submit" form={formId} className="h-12 flex-1 text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none" disabled={!canSave} data-testid="button-save-store-run">
          {saveMutation.isPending ? "Saving..." : editingId ? "Save changes" : "Add store run"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={pinSave ? "flex min-h-0 flex-1 flex-col" : "space-y-4"} data-testid="section-store-runs">
      <div className={pinSave ? "min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4" : "min-w-0 space-y-4"}>
      <form
        id={formId}
        className="min-w-0 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          saveMutation.mutate();
        }}
      >
        <section className="min-w-0 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3" aria-labelledby="store-run-receipt">
          <div className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${file || (editing?.receiptObjectPath && !form.removeReceipt) ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
              {file || (editing?.receiptObjectPath && !form.removeReceipt) ? <Check className="h-3.5 w-3.5" /> : "1"}
            </span>
            <div className="min-w-0">
              <h3 id="store-run-receipt" className="text-sm font-medium text-foreground">
                {editingId ? "Receipt" : "Start with the receipt"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {editingId
                  ? "Take a new photo or upload a file to replace the one on this line."
                  : "Take a photo or upload a file. A clear picture can fill in the store, date, and amount."}
              </p>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-16 w-full min-w-0 flex-col gap-1 bg-background px-2 text-sm" disabled={reading} onClick={() => cameraRef.current?.click()} data-testid="button-take-receipt-photo">
              <Camera />
              Take photo
            </Button>
            <Button type="button" variant="outline" className="h-16 w-full min-w-0 flex-col gap-1 bg-background px-2 text-sm" disabled={reading} onClick={() => fileRef.current?.click()} data-testid="button-upload-receipt">
              <Upload />
              Upload file
            </Button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
          {reading && <p className="text-xs text-muted-foreground">Reading the receipt...</p>}
          {fileLabel && (
            <p className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-all">{fileLabel}</span>
            </p>
          )}
          {readNote && <p className="text-xs text-muted-foreground">{readNote}</p>}
          {editingId && !file && (
            <p className="text-xs text-muted-foreground">
              {editing?.receiptFileName || "No receipt on this line"}
            </p>
          )}
          {isAdmin && editing?.receiptObjectPath && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={form.removeReceipt}
                onChange={(event) => setForm({ ...form, removeReceipt: event.target.checked })}
                data-testid="check-remove-receipt"
              />
              Remove receipt
            </label>
          )}
        </section>

        <section className="min-w-0 space-y-3 rounded-xl border border-border bg-background p-3" aria-labelledby="store-run-details">
          <div className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${gaps.some((gap) => gap !== "a receipt photo or file") ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
              {gaps.some((gap) => gap !== "a receipt photo or file") ? "2" : <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0">
              <h3 id="store-run-details" className="text-sm font-medium text-foreground">Purchase details</h3>
              <p className="text-xs text-muted-foreground">Every line is required before this store run can be added.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-name">Store</Label>
            <Input
              id="store-name"
              value={form.storeName}
              onChange={(event) => setForm({ ...form, storeName: event.target.value })}
              placeholder="Home Depot"
              className="h-11 w-full min-w-0 text-base"
              data-testid="input-store-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-item">What you bought</Label>
            <Input
              id="store-item"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Mulch, bags, and edging"
              className="h-11 w-full min-w-0 text-base"
              data-testid="input-store-item"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-po">PO</Label>
            <Input
              id="store-po"
              value={form.poNumber}
              onChange={(event) => setForm({ ...form, poNumber: event.target.value })}
              placeholder="PO-1042"
              className="h-11 w-full min-w-0 text-base"
              data-testid="input-store-po"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="store-amount">Amount paid</Label>
              <Input
                id="store-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="0.00"
                className="h-11 w-full min-w-0 text-base"
                data-testid="input-store-amount"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="store-date">Date</Label>
              <Input
                id="store-date"
                type="date"
                value={form.purchasedOn}
                onChange={(event) => setForm({ ...form, purchasedOn: event.target.value })}
                className="h-11 w-full min-w-0 max-w-full text-base"
                data-testid="input-store-date"
              />
            </div>
          </div>
        </section>

        {canOpenPurchases && (
          <section className="min-w-0 space-y-3 rounded-xl border border-border bg-background p-3" aria-labelledby="store-run-jobs">
            <div className="min-w-0">
              <h3 id="store-run-jobs" className="text-sm font-medium text-foreground">Other jobs on this receipt</h3>
              <p className="text-xs text-muted-foreground">This job is already included. Add every other job the same receipt covers.</p>
            </div>
            {(editing
              ? editing.links.filter((link) => link.kind === "task" && link.targetId !== taskId)
              : extraJobs
            ).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editing
                  ? editing.links
                    .filter((link) => link.kind === "task" && link.targetId !== taskId)
                    .map((link) => (
                      <span key={link.id} className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
                        <span className="break-words">{link.label}</span>
                        <button type="button" className="text-muted-foreground underline" onClick={() => void removeExtraLink(editing.id, link.id)}>Remove</button>
                      </span>
                    ))
                  : extraJobs.map((job) => (
                    <span key={job.id} className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
                      <span className="break-words">{job.name}</span>
                      <button type="button" className="text-muted-foreground underline" onClick={() => void addExtraJob(job)}>Remove</button>
                    </span>
                  ))}
              </div>
            )}
            <Input
              value={jobQuery}
              onChange={(event) => setJobQuery(event.target.value)}
              placeholder="Find another job"
              className="h-11 w-full min-w-0 text-base"
              aria-label="Find another job"
              data-testid="input-extra-job"
            />
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {(jobSearch?.jobs ?? [])
                .filter((job) => job.id !== taskId)
                .filter((job) => !editing || !editing.links.some((link) => link.kind === "task" && link.targetId === job.id))
                .map((job) => {
                  const picked = extraJobs.some((item) => item.id === job.id);
                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        className={`w-full rounded-md border px-3 py-2 text-left ${picked ? "border-primary bg-primary/5" : "border-border"}`}
                        onClick={() => {
                          if (!editing && !picked && extraJobs.length >= 11) {
                            toast({ title: "A receipt can be linked to 12 jobs", variant: "destructive" });
                            return;
                          }
                          void addExtraJob(job);
                        }}
                      >
                        <span className="block text-sm font-medium break-words">{picked && !editing ? "Selected · " : ""}{job.name}</span>
                        <span className="block text-xs text-muted-foreground break-words">
                          {[job.technicianName, job.propertyName].filter(Boolean).join(" · ") || "No technician or property"}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {!pinSave && saveBar}
      </form>

      {canOpenPurchases && (
      <form
        className="space-y-2 border-t border-border pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void searchSaved();
        }}
      >
        <Label htmlFor="attach-receipt">Attach a saved receipt</Label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="attach-receipt"
            value={find}
            onChange={(event) => setFind(event.target.value)}
            placeholder="Store or what you bought"
            className="h-11 min-w-0 flex-1 text-base"
            data-testid="input-attach-receipt"
          />
          <Button type="submit" variant="outline" className="h-11 shrink-0" data-testid="button-find-receipt">Find</Button>
        </div>
        {hits.length > 0 && (
          <ul className="space-y-2">
            {hits.map((purchase) => (
              <li key={purchase.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{purchase.storeName}</p>
                  <p className="text-xs text-muted-foreground">{showDay(purchase.purchasedOn)} · ${Number(purchase.amount).toFixed(2)}</p>
                </div>
                <Button type="button" variant="outline" className="h-9 shrink-0" disabled={attachMutation.isPending} onClick={() => attachMutation.mutate(purchase.id)}>
                  Attach
                </Button>
              </li>
            ))}
          </ul>
        )}
      </form>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm font-medium">On this job</p>
        {canOpenPurchases && (
          <Link href="/purchases" className="text-sm text-primary underline shrink-0">All receipts</Link>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading store runs...</p>
      ) : purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="text-store-runs-empty">No store runs on this job yet.</p>
      ) : (
        <ul className="space-y-2">
          {purchases.map((purchase) => {
            const shared = purchase.links.length > 1 || !!purchase.purpose;
            return (
              <li key={purchase.id} className="rounded-lg border border-border px-3 py-2.5" data-testid={`store-run-${purchase.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{purchase.storeName}</p>
                    <p className="text-sm text-muted-foreground break-words">{purchase.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {purchase.poNumber ? `${purchase.poNumber} · ` : ""}
                      {showDay(purchase.purchasedOn)}
                      {purchase.createdByName ? ` · ${purchase.createdByName}` : ""}
                    </p>
                    {purchase.links.some((link) => link.kind === "task" && link.targetId !== taskId) && (
                      <p className="text-xs text-muted-foreground">
                        Also on {purchase.links.filter((link) => link.kind === "task" && link.targetId !== taskId).map((link) => link.label).join(", ")}
                      </p>
                    )}
                    {purchase.receiptObjectPath && (
                      <a href={`/api/purchases/${purchase.id}/receipt`} target="_blank" rel="noreferrer" className="text-xs text-primary underline" data-testid={`link-receipt-${purchase.id}`}>
                        {purchase.receiptFileName || "Receipt"}
                      </a>
                    )}
                    {(purchase.refunds ?? []).map((refund) => (
                      <p key={refund.id} className="text-xs text-muted-foreground">
                        Refunded ${Number(refund.amount).toFixed(2)}
                        {refund.note ? ` · ${refund.note}` : ""}
                      </p>
                    ))}
                  </div>
                  <p className="text-sm font-medium shrink-0">${Number(purchase.amount).toFixed(2)}</p>
                </div>
                {(canChange(purchase) || shared) && (
                  <div className="mt-2 flex gap-2">
                    {canChange(purchase) && (
                      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => startEdit(purchase)} data-testid={`button-edit-store-run-${purchase.id}`}>
                        Edit
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        const message = shared
                          ? "Remove this receipt from this job? It stays in Purchases."
                          : "Delete this store run?";
                        if (window.confirm(message)) removeMutation.mutate(purchase);
                      }}
                      data-testid={`button-delete-store-run-${purchase.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {shared ? "Remove" : "Delete"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      </div>
      {pinSave && saveBar}
    </div>
  );
}

export function StoreRunMoreRow({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { data: purchases = [] } = useQuery<PurchaseView[]>({
    queryKey: ["/api/tasks", taskId, "purchases"],
    enabled: !!taskId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <>
      <button
        type="button"
        className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
        onClick={() => setOpen(true)}
        data-testid="action-store-run"
      >
        <div className="flex items-center justify-center shrink-0 bg-primary/10 rounded-lg" style={{ width: 32, height: 32 }}>
          <Receipt className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Store run</p>
        </div>
        <span className={`text-xs shrink-0 ${purchases.length > 0 ? "text-primary" : "text-muted-foreground"}`}>
          {purchases.length > 0 ? `${purchases.length} added` : "None"}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" data-testid="sheet-store-run">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close store run" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-[min(85dvh,40rem)] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-t-2xl bg-background sm:max-w-md sm:rounded-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-base font-medium">Store run</p>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)} data-testid="button-close-store-run">
                Close
              </Button>
            </div>
            <StoreRunPanel taskId={taskId} pinSave />
          </div>
        </div>
      )}
    </>
  );
}
