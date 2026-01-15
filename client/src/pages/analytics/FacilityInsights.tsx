import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Building2, DollarSign, AlertTriangle, CheckCircle2, ArrowLeft, MapPin } from "lucide-react";
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
}

export default function FacilityInsights() {
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
    window.open(`/api/analytics/export?type=facilities&format=${format}&${queryString}`, "_blank");
  };

  const totalFacilities = data.length;
  const totalWorkOrders = data.reduce((sum, f) => sum + f.totalWorkOrders, 0);
  const totalMaintenanceCost = data.reduce((sum, f) => sum + f.totalMaintenanceCost, 0);
  const facilitiesWithOpenWO = data.filter(f => f.openWorkOrders > 0).length;
  const highEmergencyFacilities = data.filter(f => f.emergencyWorkOrders >= 3).length;

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
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${colors[type] || ""}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Campus Facilities</h1>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/analytics">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Campus Facilities</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Property and building analytics</p>
          </div>
        </div>
        <Link href="/properties">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            View Map
          </Button>
        </Link>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <KpiCard
          title="Facilities"
          value={totalFacilities}
          icon={Building2}
        />
        <KpiCard
          title="Work Orders"
          value={totalWorkOrders}
          icon={CheckCircle2}
        />
        <KpiCard
          title="Open WO"
          value={facilitiesWithOpenWO}
          icon={AlertTriangle}
          variant={facilitiesWithOpenWO > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="High Emergency"
          value={highEmergencyFacilities}
          subtitle="3+ emergency"
          icon={AlertTriangle}
          variant={highEmergencyFacilities > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="Total Cost"
          value={`$${totalMaintenanceCost.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <PropertyBarChart 
        data={data.map(f => ({ propertyName: f.propertyName, count: f.totalWorkOrders }))} 
        title="Work Orders by Facility" 
      />

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
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Done</TableHead>
                  <TableHead className="text-xs text-right">Open</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Emerg.</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Cost</TableHead>
                  <TableHead className="text-xs w-20 sm:w-28">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(facility => {
                  const completionRate = facility.totalWorkOrders > 0 
                    ? Math.round((facility.completedWorkOrders / facility.totalWorkOrders) * 100) 
                    : 100;
                  return (
                    <TableRow key={facility.propertyId}>
                      <TableCell className="py-2">
                        <Link href={`/properties/${facility.propertyId}`}>
                          <span className="text-xs sm:text-sm text-primary hover:underline cursor-pointer font-medium line-clamp-1">
                            {facility.propertyName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">{getTypeBadge(facility.propertyType)}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2">{facility.totalWorkOrders}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2 hidden sm:table-cell">{facility.completedWorkOrders}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2">
                        {facility.openWorkOrders > 0 ? (
                          <span className="text-orange-600 font-medium">{facility.openWorkOrders}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2 hidden md:table-cell">
                        {facility.emergencyWorkOrders >= 3 ? (
                          <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {facility.emergencyWorkOrders}
                          </span>
                        ) : (
                          facility.emergencyWorkOrders
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-right py-2 hidden md:table-cell">${facility.totalMaintenanceCost.toLocaleString()}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Progress value={completionRate} className="h-1.5 sm:h-2 flex-1" />
                          <span className="text-[10px] sm:text-xs text-muted-foreground w-7">{completionRate}%</span>
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
    </div>
  );
}
