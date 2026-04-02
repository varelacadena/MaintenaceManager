import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Building2, DollarSign, AlertTriangle, CheckCircle2, MapPin, DoorOpen } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { PropertyBarChart } from "@/components/analytics/AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface FacilityWorkOrder {
  taskId: string;
  taskName: string;
  description: string;
  status: string;
  urgency: string;
  initialDate: string | null;
  completionDate: string | null;
  assignedToName: string;
  areaName: string;
  equipmentName: string;
  spaceName: string;
  taskType: string;
}

interface SpaceAnalytics {
  spaceId: string;
  spaceName: string;
  floor: string | null;
  workOrderCount: number;
  completedWorkOrders: number;
  openWorkOrders: number;
}

interface FacilityData {
  propertyId: string;
  propertyName: string;
  propertyType: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  openWorkOrders: number;
  totalMaintenanceCost: number;
  emergencyWorkOrders: number;
  preventiveWorkOrders: number;
  workOrderDetails: FacilityWorkOrder[];
  spaceAnalytics: SpaceAnalytics[];
}

export default function FacilitiesReport() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
    spaceId: "",
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

  const { data = [], isLoading } = useQuery<FacilityData[]>({
    queryKey: ["/api/analytics/facilities", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/facilities?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=facilities-detailed&format=${format}&${queryString}`, "_blank");
  };

  const totalFacilities = data.length;
  const totalWorkOrders = data.reduce((sum, f) => sum + f.totalWorkOrders, 0);
  const totalMaintenanceCost = data.reduce((sum, f) => sum + f.totalMaintenanceCost, 0);
  const facilitiesWithOpenWO = data.filter(f => f.openWorkOrders > 0).length;

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      building: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      lawn: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      parking: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      recreation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      utility: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      road: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };
    return (
      <Badge variant="secondary" className={`text-xs sm:text-xs ${colors[type] || ""}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
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
      <Badge variant={config.variant} className={`text-xs sm:text-xs ${config.className || ""}`}>
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
      <Badge variant="secondary" className={`text-xs sm:text-xs ${urgencyMap[urgency] || ""}`}>
        {urgency}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-end">
        <Link href="/properties">
          <Button variant="outline" size="sm" className="gap-2">
            <MapPin className="w-4 h-4" />
            View All Properties
          </Button>
        </Link>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KpiCard
          title="Total Facilities"
          value={totalFacilities}
          icon={Building2}
        />
        <KpiCard
          title="Work Orders"
          value={totalWorkOrders}
          icon={CheckCircle2}
        />
        <KpiCard
          title="Active Issues"
          value={facilitiesWithOpenWO}
          icon={AlertTriangle}
          variant={facilitiesWithOpenWO > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Total Cost"
          value={`$${totalMaintenanceCost.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <PropertyBarChart data={data.map(f => ({ propertyName: f.propertyName, count: f.totalWorkOrders }))} />

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Facility Details</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Facility</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-xs text-right">Total WOs</TableHead>
                  <TableHead className="text-xs text-right">Open</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Completed</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Cost</TableHead>
                  <TableHead className="text-xs w-24">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(facility => {
                  const completionRate = facility.totalWorkOrders > 0 
                    ? Math.round((facility.completedWorkOrders / facility.totalWorkOrders) * 100)
                    : 0;
                  return (
                    <TableRow key={facility.propertyId}>
                      <TableCell className="py-2">
                        <Link href={`/properties/${facility.propertyId}`}>
                          <span className="text-xs sm:text-sm text-primary hover:underline cursor-pointer font-medium">
                            {facility.propertyName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">{getTypeBadge(facility.propertyType)}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2">{facility.totalWorkOrders}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2">
                        <span className={facility.openWorkOrders > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : ""}>
                          {facility.openWorkOrders}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">{facility.completedWorkOrders}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2 hidden md:table-cell">${facility.totalMaintenanceCost.toLocaleString()}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Progress value={completionRate} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">{completionRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Space Analytics for Buildings */}
      {data.filter(f => f.propertyType === "building" && f.spaceAnalytics && f.spaceAnalytics.length > 0).length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs sm:text-sm font-medium">Space Analytics (Building Properties)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Building</TableHead>
                    <TableHead className="text-xs">Space</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Floor</TableHead>
                    <TableHead className="text-xs text-right">Total WOs</TableHead>
                    <TableHead className="text-xs text-right">Open</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.filter(f => f.propertyType === "building").flatMap(facility => 
                    facility.spaceAnalytics?.map(space => (
                      <TableRow key={space.spaceId} data-testid={`row-space-${space.spaceId}`}>
                        <TableCell className="text-xs sm:text-sm py-2">
                          <Link href={`/properties/${facility.propertyId}`}>
                            <span className="text-primary hover:underline cursor-pointer">{facility.propertyName}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 font-medium">{space.spaceName}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{space.floor || "—"}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right py-2">{space.workOrderCount}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-right py-2">
                          <span className={space.openWorkOrders > 0 ? "text-yellow-600 dark:text-yellow-400 font-medium" : ""}>
                            {space.openWorkOrders}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">{space.completedWorkOrders}</TableCell>
                      </TableRow>
                    )) || []
                  )}
                  {data.filter(f => f.propertyType === "building").every(f => !f.spaceAnalytics || f.spaceAnalytics.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No spaces defined in building properties
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">All Work Orders by Facility</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Facility</TableHead>
                  <TableHead className="text-xs">Work Order</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Urgency</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Space</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Assigned To</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.flatMap(facility => 
                  facility.workOrderDetails?.map(wo => (
                    <TableRow key={wo.taskId} data-testid={`row-wo-${wo.taskId}`}>
                      <TableCell className="text-xs sm:text-sm py-2">{facility.propertyName}</TableCell>
                      <TableCell className="py-2">
                        <Link href={`/tasks/${wo.taskId}`}>
                          <span className="text-xs sm:text-sm text-primary hover:underline cursor-pointer font-medium">
                            {wo.taskName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="py-2">{getStatusBadge(wo.status)}</TableCell>
                      <TableCell className="py-2">{getUrgencyBadge(wo.urgency)}</TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{wo.spaceName}</TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 hidden md:table-cell">{wo.assignedToName}</TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 hidden lg:table-cell">{wo.taskType}</TableCell>
                    </TableRow>
                  )) || []
                )}
                {data.every(f => !f.workOrderDetails || f.workOrderDetails.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No work orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
