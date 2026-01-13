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

  const handleExport = () => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=facilities&${queryString}`, "_blank");
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
      <Badge variant="secondary" className={colors[type] || ""}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Campus Facilities Insights</h1>
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
            <h1 className="text-2xl font-bold">Campus Facilities Insights</h1>
            <p className="text-muted-foreground">Property and building maintenance analytics</p>
          </div>
        </div>
        <Link href="/properties">
          <Button variant="outline">
            <MapPin className="w-4 h-4 mr-2" />
            View Map
          </Button>
        </Link>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["csv"]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Facilities"
          value={totalFacilities}
          icon={Building2}
        />
        <KpiCard
          title="Total Work Orders"
          value={totalWorkOrders}
          icon={CheckCircle2}
        />
        <KpiCard
          title="Facilities with Open WO"
          value={facilitiesWithOpenWO}
          icon={AlertTriangle}
          variant={facilitiesWithOpenWO > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="High Emergency Facilities"
          value={highEmergencyFacilities}
          subtitle="3+ emergency WOs"
          icon={AlertTriangle}
          variant={highEmergencyFacilities > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="Total Maintenance Cost"
          value={`$${totalMaintenanceCost.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      <PropertyBarChart 
        data={data.map(f => ({ propertyName: f.propertyName, count: f.totalWorkOrders }))} 
        title="Work Orders by Facility" 
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Facility Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total WOs</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Emergency</TableHead>
                <TableHead className="text-right">Preventive</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-32">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(facility => {
                const completionRate = facility.totalWorkOrders > 0 
                  ? Math.round((facility.completedWorkOrders / facility.totalWorkOrders) * 100) 
                  : 100;
                return (
                  <TableRow key={facility.propertyId}>
                    <TableCell>
                      <Link href={`/properties/${facility.propertyId}`}>
                        <span className="text-primary hover:underline cursor-pointer font-medium">
                          {facility.propertyName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{getTypeBadge(facility.propertyType)}</TableCell>
                    <TableCell className="text-right">{facility.totalWorkOrders}</TableCell>
                    <TableCell className="text-right">{facility.completedWorkOrders}</TableCell>
                    <TableCell className="text-right">
                      {facility.openWorkOrders > 0 ? (
                        <span className="text-orange-600 font-medium">{facility.openWorkOrders}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {facility.emergencyWorkOrders >= 3 ? (
                        <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {facility.emergencyWorkOrders}
                        </span>
                      ) : (
                        facility.emergencyWorkOrders
                      )}
                    </TableCell>
                    <TableCell className="text-right">{facility.preventiveWorkOrders}</TableCell>
                    <TableCell className="text-right">${facility.totalMaintenanceCost.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={completionRate} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{completionRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
