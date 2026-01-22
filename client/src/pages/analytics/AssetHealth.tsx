import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, AlertTriangle, DollarSign, Wrench, Calendar, User, ChevronDown, ChevronUp } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ServiceRecord {
  taskId: string;
  taskName: string;
  taskDescription: string;
  serviceDate: string | null;
  technicianId: string | null;
  technicianName: string;
  status: string;
  urgency: string;
  hoursLogged: number;
  partsCost: number;
  laborCost: number;
}

interface AssetData {
  equipmentId: string;
  equipmentName: string;
  propertyName: string;
  category: string;
  condition: string | null;
  workOrderCount: number;
  totalMaintenanceCost: number;
  lastMaintenanceDate: string | null;
  lastServicedBy: string | null;
  failureFrequency: number;
  serviceHistory: ServiceRecord[];
}

type KpiModalType = "total" | "issues" | "highFailure" | "poorCondition" | "cost" | null;

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

  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  const [kpiModal, setKpiModal] = useState<KpiModalType>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=assets&format=${format}&${queryString}`, "_blank");
  };

  const totalAssets = data.length;
  const assetsWithIssues = data.filter(a => a.workOrderCount > 0).length;
  const highFailureAssets = data.filter(a => a.failureFrequency >= 5).length;
  const totalMaintenanceCost = data.reduce((sum, a) => sum + a.totalMaintenanceCost, 0);
  const poorConditionAssets = data.filter(a => 
    a.condition?.toLowerCase() === "poor" || a.condition?.toLowerCase() === "needs replacement"
  ).length;

  const getFilteredDataForKpi = (type: KpiModalType): AssetData[] => {
    switch (type) {
      case "total":
        return data;
      case "issues":
        return data.filter(a => a.workOrderCount > 0);
      case "highFailure":
        return data.filter(a => a.failureFrequency >= 5);
      case "poorCondition":
        return data.filter(a => a.condition?.toLowerCase() === "poor" || a.condition?.toLowerCase() === "needs replacement");
      case "cost":
        return data.filter(a => a.totalMaintenanceCost > 0).sort((a, b) => b.totalMaintenanceCost - a.totalMaintenanceCost);
      default:
        return [];
    }
  };

  const getKpiModalInfo = (type: KpiModalType) => {
    switch (type) {
      case "total":
        return { title: "All Assets", description: "Complete inventory of all tracked equipment and assets" };
      case "issues":
        return { title: "Assets With Issues", description: "Equipment that has had at least one work order" };
      case "highFailure":
        return { title: "High Failure Assets", description: "Equipment with 5 or more work orders - may need evaluation or replacement" };
      case "poorCondition":
        return { title: "Poor Condition Assets", description: "Equipment marked as 'Poor' or 'Needs Replacement' condition" };
      case "cost":
        return { title: "Maintenance Cost Breakdown", description: "Assets sorted by total maintenance cost (parts + labor)" };
      default:
        return { title: "", description: "" };
    }
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getConditionBadge = (condition: string | null) => {
    if (!condition) return <Badge variant="secondary" className="text-[10px] sm:text-xs">Unknown</Badge>;
    const lower = condition.toLowerCase();
    if (lower === "good") return <Badge variant="default" className="bg-green-600 text-[10px] sm:text-xs">Good</Badge>;
    if (lower === "fair") return <Badge variant="default" className="bg-yellow-600 text-[10px] sm:text-xs">Fair</Badge>;
    if (lower === "poor") return <Badge variant="default" className="bg-red-600 text-[10px] sm:text-xs">Poor</Badge>;
    if (lower === "needs replacement") return <Badge variant="destructive" className="text-[10px] sm:text-xs">Replace</Badge>;
    return <Badge variant="secondary" className="text-[10px] sm:text-xs">{condition}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive"; className?: string }> = {
      completed: { variant: "default", className: "bg-green-600" },
      in_progress: { variant: "default", className: "bg-blue-600" },
      on_hold: { variant: "default", className: "bg-yellow-600" },
      not_started: { variant: "secondary" },
    };
    const config = statusMap[status] || { variant: "secondary" as const };
    return (
      <Badge variant={config.variant} className={`text-[10px] sm:text-xs ${config.className || ""}`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return (
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${urgencyMap[urgency] || ""}`}>
        {urgency}
      </Badge>
    );
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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Asset Health</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Equipment maintenance and reliability</p>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <div className="cursor-pointer hover-elevate" onClick={() => setKpiModal("total")} data-testid="kpi-total-assets">
          <KpiCard
            title="Total Assets"
            value={totalAssets}
            subtitle="Click for details"
            icon={Settings}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => setKpiModal("issues")} data-testid="kpi-with-issues">
          <KpiCard
            title="With Issues"
            value={assetsWithIssues}
            subtitle="Click for details"
            icon={Wrench}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => setKpiModal("highFailure")} data-testid="kpi-high-failure">
          <KpiCard
            title="High Failure"
            value={highFailureAssets}
            subtitle="5+ work orders - click for details"
            icon={AlertTriangle}
            variant={highFailureAssets > 0 ? "danger" : "default"}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => setKpiModal("poorCondition")} data-testid="kpi-poor-condition">
          <KpiCard
            title="Poor Condition"
            value={poorConditionAssets}
            subtitle="Click for details"
            icon={AlertTriangle}
            variant={poorConditionAssets > 0 ? "warning" : "default"}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => setKpiModal("cost")} data-testid="kpi-total-cost">
          <KpiCard
            title="Total Cost"
            value={`$${totalMaintenanceCost.toLocaleString()}`}
            subtitle="Click for breakdown"
            icon={DollarSign}
          />
        </div>
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
                  <TableHead className="text-xs hidden md:table-cell">Last Serviced</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 15).map(asset => (
                  <TableRow 
                    key={asset.equipmentId} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAsset(asset)}
                    data-testid={`asset-row-${asset.equipmentId}`}
                  >
                    <TableCell className="py-2">
                      <span className="text-xs sm:text-sm text-primary hover:underline cursor-pointer font-medium line-clamp-1">
                        {asset.equipmentName}
                      </span>
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
                    <TableCell className="py-2 hidden lg:table-cell">
                      {asset.lastServicedBy ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {asset.lastServicedBy}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
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
                    <TableRow 
                      key={asset.equipmentId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAsset(asset)}
                    >
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

      {/* KPI Detail Modal */}
      <Dialog open={kpiModal !== null} onOpenChange={() => setKpiModal(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{getKpiModalInfo(kpiModal).title}</DialogTitle>
            <DialogDescription>{getKpiModalInfo(kpiModal).description}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {getFilteredDataForKpi(kpiModal).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No assets found in this category</p>
              ) : (
                getFilteredDataForKpi(kpiModal).map(asset => (
                  <Card key={asset.equipmentId} className="p-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{asset.equipmentName}</h4>
                          {getCategoryBadge(asset.category)}
                          {getConditionBadge(asset.condition)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{asset.propertyName}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            {asset.workOrderCount} work orders
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${asset.totalMaintenanceCost.toLocaleString()}
                          </span>
                          {asset.lastMaintenanceDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Last: {new Date(asset.lastMaintenanceDate).toLocaleDateString()}
                            </span>
                          )}
                          {asset.lastServicedBy && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              By: {asset.lastServicedBy}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setKpiModal(null);
                          setSelectedAsset(asset);
                        }}
                        data-testid={`view-details-${asset.equipmentId}`}
                      >
                        View Tasks
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Modal with Service History */}
      <Dialog open={selectedAsset !== null} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {selectedAsset?.equipmentName}
                  {selectedAsset && getCategoryBadge(selectedAsset.category)}
                  {selectedAsset && getConditionBadge(selectedAsset.condition)}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedAsset?.propertyName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Work Orders</div>
                  <div className="text-lg font-bold">{selectedAsset?.workOrderCount || 0}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Total Cost</div>
                  <div className="text-lg font-bold">${selectedAsset?.totalMaintenanceCost.toLocaleString() || 0}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Last Service</div>
                  <div className="text-sm font-medium">
                    {selectedAsset?.lastMaintenanceDate 
                      ? new Date(selectedAsset.lastMaintenanceDate).toLocaleDateString()
                      : "Never"
                    }
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Serviced By</div>
                  <div className="text-sm font-medium truncate">{selectedAsset?.lastServicedBy || "-"}</div>
                </Card>
              </div>

              {/* Service History / Task Breakdown */}
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-medium">Service History & Task Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedAsset?.serviceHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No service records found</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedAsset?.serviceHistory.map(record => (
                        <Collapsible 
                          key={record.taskId}
                          open={expandedTasks.has(record.taskId)}
                          onOpenChange={() => toggleTask(record.taskId)}
                        >
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger className="w-full p-3 text-left hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{record.taskName}</span>
                                    {getStatusBadge(record.status)}
                                    {getUrgencyBadge(record.urgency)}
                                  </div>
                                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {record.serviceDate 
                                        ? new Date(record.serviceDate).toLocaleDateString()
                                        : "Not scheduled"
                                      }
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {record.technicianName}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    ${(record.partsCost + record.laborCost).toLocaleString()}
                                  </span>
                                  {expandedTasks.has(record.taskId) ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="p-3 pt-0 border-t bg-muted/20">
                                <div className="space-y-3">
                                  <div>
                                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Description</h5>
                                    <p className="text-sm">{record.taskDescription || "No description provided"}</p>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Service Date</h5>
                                      <p className="text-sm">
                                        {record.serviceDate 
                                          ? new Date(record.serviceDate).toLocaleDateString()
                                          : "-"
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Technician</h5>
                                      <p className="text-sm">{record.technicianName}</p>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Hours Logged</h5>
                                      <p className="text-sm">{record.hoursLogged} hrs</p>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Status</h5>
                                      <p className="text-sm capitalize">{record.status.replace(/_/g, " ")}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Parts Cost</h5>
                                      <p className="text-sm font-medium">${record.partsCost.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Labor Cost</h5>
                                      <p className="text-sm font-medium">${record.laborCost.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Total Cost</h5>
                                      <p className="text-sm font-bold">${(record.partsCost + record.laborCost).toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
