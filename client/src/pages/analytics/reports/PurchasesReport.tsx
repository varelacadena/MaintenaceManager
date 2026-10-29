import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAnalyticsFilters } from "../useAnalyticsFilters";

type PurchaseRow = {
  id: string;
  taskId: string;
  taskName: string;
  propertyName: string | null;
  storeName: string;
  description: string;
  amount: number;
  purchasedOn: string;
  receiptFileName: string | null;
  createdByName: string | null;
  hasReceipt: boolean;
};

function showDay(value: string): string {
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? format(parsed, "MMM d, yyyy") : value;
}

async function downloadExport(formatName: "csv" | "zip", query: string) {
  const params = new URLSearchParams(query);
  params.set("format", formatName);
  const response = await fetch(`/api/analytics/purchases/export?${params.toString()}`, {
    credentials: "include",
  });
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

export default function PurchasesReport() {
  const { filters } = useAnalyticsFilters();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"csv" | "zip" | null>(null);
  const query = new URLSearchParams();
  if (filters.startDate) query.set("startDate", filters.startDate);
  if (filters.endDate) query.set("endDate", filters.endDate);
  if (filters.propertyId) query.set("propertyId", filters.propertyId);
  const queryString = query.toString();

  const { data: rows = [], isLoading } = useQuery<PurchaseRow[]>({
    queryKey: ["/api/analytics/purchases", filters.startDate, filters.endDate, filters.propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/purchases${queryString ? `?${queryString}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load purchases");
      return response.json();
    },
  });

  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const receipts = rows.filter((row) => row.hasReceipt).length;

  const download = async (formatName: "csv" | "zip") => {
    setBusy(formatName);
    try {
      await downloadExport(formatName, queryString);
    } catch (error) {
      toast({
        title: formatName === "zip" ? "Could not download receipts" : "Could not download spreadsheet",
        description: error instanceof Error ? error.message : "Download failed",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3" data-testid="purchases-report">
      <p className="text-sm text-muted-foreground">
        Purchases use the date on the receipt. The spreadsheet is the list for accounting. The zip is the receipt files, named by date, store, and amount.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <p><span className="text-muted-foreground">Purchases </span><span className="font-medium" data-testid="text-purchase-count">{rows.length}</span></p>
        <p><span className="text-muted-foreground">Spent </span><span className="font-medium" data-testid="text-purchase-total">${total.toFixed(2)}</span></p>
        <p><span className="text-muted-foreground">Receipts </span><span className="font-medium">{receipts}</span></p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-11 sm:h-9" disabled={busy !== null} onClick={() => download("csv")} data-testid="button-download-purchases">
          {busy === "csv" ? "Downloading..." : "Download spreadsheet"}
        </Button>
        <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy !== null || receipts === 0} onClick={() => download("zip")} data-testid="button-download-receipts">
          {busy === "zip" ? "Downloading..." : "Download receipts"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Building</th>
              <th className="px-3 py-2 font-medium">Store</th>
              <th className="px-3 py-2 font-medium">What was bought</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-3 py-4 text-muted-foreground" colSpan={6}>Loading purchases...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-4 text-muted-foreground" colSpan={6}>No store purchases in this period.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{showDay(row.purchasedOn)}</td>
                <td className="px-3 py-2">
                  <Link href={`/tasks/${row.taskId}`} className="underline">{row.taskName}</Link>
                </td>
                <td className="px-3 py-2">{row.propertyName || ""}</td>
                <td className="px-3 py-2">{row.storeName}</td>
                <td className="px-3 py-2">{row.description}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">${Number(row.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
