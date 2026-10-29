import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { ChevronRight, Receipt, Trash2 } from "lucide-react";
import type { TaskPurchase } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSignedUploadParameters } from "@/lib/uploadUtils";

const MAX_RECEIPT_BYTES = 15 * 1024 * 1024;

type ReceiptPayload = {
  fileName: string;
  fileType: string;
  objectPath: string;
};

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

function fileTypeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

async function uploadReceipt(file: File): Promise<ReceiptPayload> {
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt must be 15 MB or smaller");
  }
  const params = await getSignedUploadParameters();
  if (!params.objectPath) throw new Error("Could not start the receipt upload");
  const isMock = params.url.startsWith("https://mock-storage.local/");
  if (!isMock) {
    const response = await fetch(params.url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": fileTypeOf(file) },
    });
    if (!response.ok) throw new Error("Could not upload the receipt");
  }
  return {
    fileName: file.name,
    fileType: fileTypeOf(file),
    objectPath: params.objectPath,
  };
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

export function StoreRunPanel({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const { data: purchases = [], isLoading } = useQuery<TaskPurchase[]>({
    queryKey: ["/api/tasks", taskId, "purchases"],
    enabled: !!taskId,
  });

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFile(null);
    setFileKey((key) => key + 1);
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
      if (file) body.receipt = await uploadReceipt(file);
      else if (editing && form.removeReceipt) body.receipt = null;

      if (editing) {
        const response = await apiRequest("PATCH", `/api/task-purchases/${editing.id}`, body);
        return response.json();
      }
      const response = await apiRequest("POST", `/api/tasks/${taskId}/purchases`, body);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: editingId ? "Store run updated" : "Store run added" });
      reset();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "purchases"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save store run", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/task-purchases/${id}`);
    },
    onSuccess: () => {
      if (editingId) reset();
      toast({ title: "Store run deleted" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "purchases"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete store run", description: error.message, variant: "destructive" });
    },
  });

  const startEdit = (purchase: TaskPurchase) => {
    setEditingId(purchase.id);
    setFile(null);
    setForm({
      storeName: purchase.storeName,
      description: purchase.description,
      amount: Number(purchase.amount).toFixed(2),
      purchasedOn: purchase.purchasedOn,
      removeReceipt: false,
    });
  };

  const canChange = (purchase: TaskPurchase) =>
    isAdmin || (!!user?.id && purchase.createdById === user.id);

  return (
    <div className="space-y-3" data-testid="section-store-runs">
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
          <Label htmlFor="store-receipt">{editingId ? "Replace receipt" : "Receipt"}</Label>
          <Input
            id="store-receipt"
            key={fileKey}
            type="file"
            accept="image/*,application/pdf"
            className="h-11 text-base file:mr-3 file:text-sm"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              if (event.target.files?.[0]) setForm({ ...form, removeReceipt: false });
            }}
            data-testid="input-store-receipt"
          />
          {file && <p className="text-xs text-muted-foreground break-all">{file.name}</p>}
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
          <Button
            type="submit"
            className="h-11 flex-1 sm:flex-none"
            disabled={saveMutation.isPending}
            data-testid="button-save-store-run"
          >
            {saveMutation.isPending ? "Saving..." : editingId ? "Save changes" : "Add store run"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={reset} data-testid="button-cancel-store-run">
              Cancel
            </Button>
          )}
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading store runs...</p>
      ) : purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="text-store-runs-empty">No store runs on this job yet.</p>
      ) : (
        <ul className="space-y-2">
          {purchases.map((purchase) => (
            <li
              key={purchase.id}
              className="rounded-lg border border-border px-3 py-2.5"
              data-testid={`store-run-${purchase.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{purchase.storeName}</p>
                  <p className="text-sm text-muted-foreground break-words">{purchase.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {showDay(purchase.purchasedOn)}
                    {purchase.createdByName ? ` · ${purchase.createdByName}` : ""}
                  </p>
                  {purchase.receiptObjectPath && (
                    <a
                      href={`/api/task-purchases/${purchase.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                      data-testid={`link-receipt-${purchase.id}`}
                    >
                      {purchase.receiptFileName || "Receipt"}
                    </a>
                  )}
                </div>
                <p className="text-sm font-medium shrink-0">${Number(purchase.amount).toFixed(2)}</p>
              </div>
              {canChange(purchase) && (
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => startEdit(purchase)} data-testid={`button-edit-store-run-${purchase.id}`}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this store run?")) deleteMutation.mutate(purchase.id);
                    }}
                    data-testid={`button-delete-store-run-${purchase.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StoreRunMoreRow({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { data: purchases = [] } = useQuery<TaskPurchase[]>({
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
