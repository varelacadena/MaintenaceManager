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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
    if (!condition) return <Badge variant="secondary" className="text-[10px] sm:text-xs">Unknown</Badge>;
    const lower = condition.toLowerCase();
    if (lower === "good") return <Badge variant="default" className="bg-green-600 text-[10px] sm:text-xs">Good</Badge>;
    if (lower === "fair") return <Badge variant="default" className="bg-yellow-600 text-[10px] sm:text-xs">Fair</Badge>;
    if (lower === "poor") return <Badge variant="default" className="bg-red-600 text-[10px] sm:text-xs">Poor</Badge>;
    if (lower === "needs replacement") return <Badge variant="destructive" className="text-[10px] sm:text-xs">Replace</Badge>;
    return <Badge variant="secondary" className="text-[10px] sm:text-xs">{condition}</Badge>;
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
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${colors[category] || ""}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Asset Health</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/analytics">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Asset Health</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Equipment maintenance and reliability</p>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["csv"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <KpiCard
          title="Total Assets"
          value={totalAssets}
          icon={Settings}
        />
        <KpiCard
          title="With Issues"
          value={assetsWithIssues}
          icon={Wrench}
        />
        <KpiCard
          title="High Failure"
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
          title="Total Cost"
          value={`$${totalMaintenanceCost.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Asset Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Equipment</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Property</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-xs">Condition</TableHead>
                  <TableHead className="text-xs text-right">WOs</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Cost</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Last Maint.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 15).map(asset => (
                  <TableRow key={asset.equipmentId}>
                    <TableCell className="py-2">
                      <Link href={`/equipment/${asset.equipmentId}/work-history`}>
                        <span className="text-xs sm:text-sm text-primary hover:underline cursor-pointer font-medium line-clamp-1">
                          {asset.equipmentName}
                        </span>
                      </Link>
                      {asset.failureFrequency >= 5 && (
                        <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell max-w-[100px] truncate">{asset.propertyName}</TableCell>
                    <TableCell className="py-2 hidden md:table-cell">{getCategoryBadge(asset.category)}</TableCell>
                    <TableCell className="py-2">{getConditionBadge(asset.condition)}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-right py-2">{asset.workOrderCount}</TableCell>
                    <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">${asset.totalMaintenanceCost.toLocaleString()}</TableCell>
                    <TableCell className="py-2 hidden md:table-cell">
                      {asset.lastMaintenanceDate ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(asset.lastMaintenanceDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {highFailureAssets > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              High Failure Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Equipment</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Property</TableHead>
                    <TableHead className="text-xs text-right">WOs</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Cost</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.filter(a => a.failureFrequency >= 5).map(asset => (
                    <TableRow key={asset.equipmentId}>
                      <TableCell className="text-xs sm:text-sm font-medium py-2 max-w-[120px] truncate">{asset.equipmentName}</TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell max-w-[100px] truncate">{asset.propertyName}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2">{asset.workOrderCount}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">${asset.totalMaintenanceCost.toLocaleString()}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="destructive" className="text-[10px] sm:text-xs">
                          {asset.workOrderCount >= 10 ? "Replace" : "Evaluate"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
