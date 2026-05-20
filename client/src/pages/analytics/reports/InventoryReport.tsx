import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Package, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import { useAnalyticsFilters } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountBarChart } from "@/components/analytics/AnalyticsCharts";
import { formatQty } from "@/pages/Inventory/inventoryConstants";

interface InventoryOverview {
  totalItems: number;
  lowStockCount: number;
  estimatedValue: number;
  partsUsageCount: number;
  byCategory: { category: string; count: number }[];
  lowStockItems: {
    id: string;
    name: string;
    category: string | null;
    quantity: string;
    unit: string | null;
    stockStatus: string | null;
    trackingMode: string | null;
  }[];
  topUsedInPeriod: {
    inventoryItemId: string;
    name: string;
    totalQuantity: number;
  }[];
}

export default function InventoryReport() {
  const [, setLocation] = useLocation();
  const { filters, setFilters, buildQueryString } = useAnalyticsFilters();
  const queryString = buildQueryString();
  const { handleExport, isExporting } = useAnalyticsExport("inventory-detailed", () => buildQueryString());

  const { data, isLoading, isError, refetch } = useQuery<InventoryOverview>({
    queryKey: ["/api/analytics/inventory", filters],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/inventory?${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory analytics");
      return res.json();
    },
  });

  if (isError) {
    return (
      <AnalyticsReportError
        filters={filters}
        onFilterChange={setFilters}
        message="Could not load inventory analytics"
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const categoryChart = data.byCategory.map((row) => ({
    name: row.category.charAt(0).toUpperCase() + row.category.slice(1),
    value: row.count,
  }));

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Total items" value={data.totalItems} icon={Package} />
        <KpiCard
          title="Low stock"
          value={data.lowStockCount}
          icon={AlertTriangle}
          variant={data.lowStockCount > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="Est. inventory value"
          value={`$${data.estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="success"
        />
        <KpiCard title="Parts used (period)" value={data.partsUsageCount} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categoryChart.length > 0 ? (
          <CountBarChart
            title="Items by category"
            testId="chart-inventory-category"
            data={categoryChart}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No inventory items yet.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most used in period</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topUsedInPeriod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parts usage in the selected date range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topUsedInPeriod.map((row) => (
                    <TableRow key={row.inventoryItemId}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{formatQty(row.totalQuantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {data.lowStockItems.length > 0 && (
        <Card
          className="cursor-pointer hover-elevate transition-shadow"
          onClick={() => setLocation("/inventory?lowStock=1")}
          data-testid="card-inventory-low-stock"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low stock items
              <span className="text-xs font-normal text-muted-foreground ml-auto">View in inventory →</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status / Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="capitalize">{item.category || "general"}</TableCell>
                    <TableCell>
                      {item.trackingMode === "status" ? (
                        <Badge variant="destructive">{item.stockStatus || "low"}</Badge>
                      ) : (
                        <span>
                          {formatQty(item.quantity)} {item.unit || ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
