import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { ChevronRight, Receipt, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { PurchaseView } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { prepareReceipt, type ReceiptPayload, type ReceiptSuggestion } from "@/lib/purchaseReceipt";

type PurchaseBody = {
  storeName: string;
  description: string;
  amount: number;
  purchasedOn: string;
  receipt?: ReceiptPayload | null;
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

export function StoreRunPanel({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
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

  const { data: purchases = [], isLoading } = useQuery<PurchaseView[]>({
    queryKey: ["/api/tasks", taskId, "purchases"],
    enabled: !!taskId,
  });

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFile(null);
    setFileLabel("");
    setReadNote(null);
  };

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
      const editing = purchases.find((purchase) => purchase.id === editingId);
      if (!editing && !file) throw new Error("Add a photo or PDF of the receipt");
      if (editing && form.removeReceipt && !isAdmin) throw new Error("Keep the receipt, or ask an admin to remove it");

      const body: PurchaseBody = {
        storeName: form.storeName.trim(),
        description: form.description.trim(),
        amount,
        purchasedOn: form.purchasedOn,
      };
      if (file) body.receipt = file;
      else if (editing && form.removeReceipt) body.receipt = null;

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

  return (
    <div className="space-y-3" data-testid="section-store-runs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Receipts for this job.</p>
        <Link href="/purchases" className="text-sm text-primary underline shrink-0">All receipts</Link>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="store-name">Store</Label>
          <Input
            id="store-name"
            value={form.storeName}
            onChange={(event) => setForm({ ...form, storeName: event.target.value })}
            placeholder="Home Depot"
            className="h-11 text-base"
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
            className="h-11 text-base"
            data-testid="input-store-item"
          />
        </div>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
          <div className="space-y-1.5">
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
              className="h-11 text-base"
              data-testid="input-store-amount"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-date">Date</Label>
            <Input
              id="store-date"
              type="date"
              value={form.purchasedOn}
              onChange={(event) => setForm({ ...form, purchasedOn: event.target.value })}
              className="h-11 text-base"
              data-testid="input-store-date"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{editingId ? "Replace receipt" : "Receipt"}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" disabled={reading} onClick={() => cameraRef.current?.click()} data-testid="button-take-receipt-photo">
              Take photo
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={reading} onClick={() => fileRef.current?.click()} data-testid="button-upload-receipt">
              Upload file
            </Button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => { void onFile(event.target.files); event.target.value = ""; }} />
          {reading && <p className="text-xs text-muted-foreground">Reading the receipt...</p>}
          {fileLabel && <p className="text-xs text-muted-foreground break-all">{fileLabel}</p>}
          {readNote && <p className="text-xs text-muted-foreground">{readNote}</p>}
          {editingId && !file && (
            <p className="text-xs text-muted-foreground">
              {purchases.find((purchase) => purchase.id === editingId)?.receiptFileName || "No receipt on this line"}
            </p>
          )}
          {isAdmin && editingId && purchases.find((purchase) => purchase.id === editingId)?.receiptObjectPath && (
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
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-11 flex-1 sm:flex-none" disabled={saveMutation.isPending || reading} data-testid="button-save-store-run">
            {saveMutation.isPending ? "Saving..." : editingId ? "Save changes" : "Add store run"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={reset} data-testid="button-cancel-store-run">
              Cancel
            </Button>
          )}
        </div>
      </form>

      <form
        className="space-y-2 border-t border-border pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void searchSaved();
        }}
      >
        <Label htmlFor="attach-receipt">Attach a saved receipt</Label>
        <div className="flex gap-2">
          <Input
            id="attach-receipt"
            value={find}
            onChange={(event) => setFind(event.target.value)}
            placeholder="Store or what you bought"
            className="h-11 text-base"
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
                      {showDay(purchase.purchasedOn)}
                      {purchase.createdByName ? ` · ${purchase.createdByName}` : ""}
                    </p>
                    {purchase.receiptObjectPath && (
                      <a href={`/api/purchases/${purchase.id}/receipt`} target="_blank" rel="noreferrer" className="text-xs text-primary underline" data-testid={`link-receipt-${purchase.id}`}>
                        {purchase.receiptFileName || "Receipt"}
                      </a>
                    )}
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
  );
}

export function StoreRunMoreRow({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { data: purchases = [] } = useQuery<PurchaseView[]>({
    queryKey: ["/api/tasks", taskId, "purchases"],
    enabled: !!taskId,
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
          <div className="relative z-10 flex max-h-[min(85dvh,40rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-background sm:max-w-md sm:rounded-xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-base font-medium">Store run</p>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)} data-testid="button-close-store-run">
                Close
              </Button>
            </div>
            <div className="overflow-y-auto px-4 py-3">
              <StoreRunPanel taskId={taskId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
