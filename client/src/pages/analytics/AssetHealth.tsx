import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Settings, AlertTriangle, DollarSign, Wrench, ArrowLeft, Calendar } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AssetData {
  equipmentId: string;
  equipmentName: string;
  propertyName: string;
  category: string;
  condition: string | null;
  workOrderCount: number;
  totalMaintenanceCost: number;
  lastMaintenanceDate: string | null;
  failureFrequency: number;
}

export default function AssetHealth() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
    areaId: "",
    technicianId: "",
    status: "",
    urgency: "",
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const { data = [], isLoading } = useQuery<AssetData[]>({
    queryKey: ["/api/analytics/assets", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/assets?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const handleExport = () => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=assets&${queryString}`, "_blank");
  };

  const totalAssets = data.length;
  const assetsWithIssues = data.filter(a => a.workOrderCount > 0).length;
  const highFailureAssets = data.filter(a => a.failureFrequency >= 5).length;
  const totalMaintenanceCost = data.reduce((sum, a) => sum + a.totalMaintenanceCost, 0);
  const poorConditionAssets = data.filter(a => 
    a.condition?.toLowerCase() === "poor" || a.condition?.toLowerCase() === "needs replacement"
  ).length;

  const getConditionBadge = (condition: string | null) => {
    if (!condition) return <Badge variant="secondary">Unknown</Badge>;
    const lower = condition.toLowerCase();
    if (lower === "good") return <Badge variant="default" className="bg-green-600">Good</Badge>;
    if (lower === "fair") return <Badge variant="default" className="bg-yellow-600">Fair</Badge>;
    if (lower === "poor") return <Badge variant="default" className="bg-red-600">Poor</Badge>;
    if (lower === "needs replacement") return <Badge variant="destructive">Needs Replacement</Badge>;
    return <Badge variant="secondary">{condition}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      hvac: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      plumbing: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      electric: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      appliances: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      structure: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      landscaping: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return (
      <Badge variant="secondary" className={colors[category] || ""}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Asset Health</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/analytics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Asset Health</h1>
            <p className="text-muted-foreground">Equipment maintenance and reliability metrics</p>
          </div>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["csv"]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Assets"
          value={totalAssets}
          icon={Settings}
        />
        <KpiCard
          title="Assets with Work Orders"
          value={assetsWithIssues}
          icon={Wrench}
        />
        <KpiCard
          title="High Failure Rate"
          value={highFailureAssets}
          subtitle="5+ work orders"
          icon={AlertTriangle}
          variant={highFailureAssets > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="Poor Condition"
          value={poorConditionAssets}
          icon={AlertTriangle}
          variant={poorConditionAssets > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Total Maintenance Cost"
          value={`$${totalMaintenanceCost.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Asset Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Work Orders</TableHead>
                <TableHead className="text-right">Maintenance Cost</TableHead>
                <TableHead>Last Maintenance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 20).map(asset => (
                <TableRow key={asset.equipmentId}>
                  <TableCell>
                    <Link href={`/equipment/${asset.equipmentId}/work-history`}>
                      <span className="text-primary hover:underline cursor-pointer font-medium">
                        {asset.equipmentName}
                      </span>
                    </Link>
                    {asset.failureFrequency >= 5 && (
                      <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />
                    )}
                  </TableCell>
                  <TableCell>{asset.propertyName}</TableCell>
                  <TableCell>{getCategoryBadge(asset.category)}</TableCell>
                  <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                  <TableCell className="text-right">{asset.workOrderCount}</TableCell>
                  <TableCell className="text-right">${asset.totalMaintenanceCost.toLocaleString()}</TableCell>
                  <TableCell>
                    {asset.lastMaintenanceDate ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(asset.lastMaintenanceDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {highFailureAssets > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High Failure Assets (Consider Replacement)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Work Orders</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.filter(a => a.failureFrequency >= 5).map(asset => (
                  <TableRow key={asset.equipmentId}>
                    <TableCell className="font-medium">{asset.equipmentName}</TableCell>
                    <TableCell>{asset.propertyName}</TableCell>
                    <TableCell className="text-right">{asset.workOrderCount}</TableCell>
                    <TableCell className="text-right">${asset.totalMaintenanceCost.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {asset.workOrderCount >= 10 ? "Replace Immediately" : "Evaluate for Replacement"}
                      </Badge>
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
