import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Car, Calendar, DollarSign, CheckCircle2, XCircle, Wrench, Clock, TrendingUp } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsReportError from "@/components/analytics/AnalyticsReportError";
import AnalyticsDetailFetchBanner from "@/components/analytics/AnalyticsDetailFetchBanner";
import { hasActiveAnalyticsFilters } from "../analyticsReportUtils";
import { useAnalyticsFilters } from "../useAnalyticsFilters";
import { useAnalyticsExport } from "../useAnalyticsExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusPieChart, CountBarChart, SimpleCountLineChart } from "@/components/analytics/AnalyticsCharts";

interface DetailedReservation {
  id: string;
  vehicleId: string | null;
  vehicleName: string;
  userId: string;
  userName: string;
  purpose: string;
  passengerCount: number;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
  createdAt: string | null;
}

interface DetailedVehicle {
  id: string;
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  category: string;
  status: string;
  currentMileage: number | null;
  fuelType: string;
  licensePlate: string | null;
}

interface FleetOverview {
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  outOfServiceVehicles: number;
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  totalMaintenanceCost: number;
  avgUtilizationRate: number;
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  reservationsByMonth: { month: string; count: number }[];
  maintenanceByVehicle: { vehicleId: string; vehicleName: string; cost: number; count: number }[];
  detailedReservations: DetailedReservation[];
  detailedVehicles: DetailedVehicle[];
}

export default function FleetReport() {
  const { filters, setFilters, buildQueryString, clearFilters } = useAnalyticsFilters();
  const hasActiveFilters = hasActiveAnalyticsFilters(filters);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: string; title: string }>({
    open: false,
    type: "",
    title: "",
  });

  const queryString = buildQueryString();
  const { handleExport, isExporting } = useAnalyticsExport("fleet-detailed", () => buildQueryString());

  const { data: summary, isLoading: summaryLoading, isError, refetch } = useQuery<FleetOverview>({
    queryKey: ["/api/analytics/fleet/summary", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/fleet/summary?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch fleet analytics");
      return response.json();
    },
  });

  const { data: details, isError: detailsError, refetch: refetchDetails } = useQuery<FleetOverview>({
    queryKey: ["/api/analytics/fleet", filters, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/fleet?${queryString}`);
      if (!response.ok) throw new Error("Failed to fetch fleet details");
      return response.json();
    },
  });

  const data = summary
    ? {
        ...summary,
        detailedReservations: details?.detailedReservations ?? [],
        detailedVehicles: details?.detailedVehicles ?? [],
      }
    : undefined;
  const isLoading = summaryLoading;

  const openDetailDialog = (type: string, title: string) => {
    setDetailDialog({ open: true, type, title });
  };

  if (isError) {
    return (
      <AnalyticsReportError
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string }> = {
      available: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      in_use: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      needs_maintenance: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      needs_cleaning: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    };
    const config = statusMap[status] || { className: "" };
    return (
      <Badge variant="secondary" className={`text-xs sm:text-xs ${config.className}`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getReservationStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string }> = {
      pending: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      approved: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      checked_out: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      completed: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
      cancelled: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    };
    const config = statusMap[status] || { className: "" };
    return (
      <Badge variant="secondary" className={`text-xs sm:text-xs ${config.className}`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportLoading={isExporting}
        exportOptions={["pdf", "xlsx"]}
      />

      {detailsError && (
        <AnalyticsDetailFetchBanner onRetry={() => void refetchDetails()} />
      )}

      {data && data.totalVehicles === 0 ? (
        <AnalyticsEmptyState
          title="No fleet data matches these filters"
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("vehicles", "All Vehicles")}>
          <KpiCard
            title="Total Vehicles"
            value={data?.totalVehicles || 0}
            subtitle="Click for details"
            icon={Car}
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("available", "Available Vehicles")}>
          <KpiCard
            title="Available"
            value={data?.availableVehicles || 0}
            subtitle="Click for details"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div className="cursor-pointer hover-elevate" onClick={() => openDetailDialog("reservations", "All Reservations")}>
          <KpiCard
            title="Reservations"
            value={data?.totalReservations || 0}
            subtitle="Click for details"
            icon={Calendar}
          />
        </div>
        <KpiCard
          title="Reservation Utilization"
          value={`${data?.avgUtilizationRate || 0}%`}
          subtitle="Reserved vehicle-days in period"
          icon={TrendingUp}
          variant={data?.avgUtilizationRate && data.avgUtilizationRate >= 70 ? "success" : "warning"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data?.byStatus && data.byStatus.length > 0 && (
          <StatusPieChart data={data.byStatus} title="Vehicle status" />
        )}
        {data?.byCategory && data.byCategory.length > 0 && (
          <CountBarChart
            title="By category"
            testId="chart-fleet-category"
            data={data.byCategory.map((c) => ({
              name: c.category,
              value: c.count,
            }))}
          />
        )}
        {data?.reservationsByMonth && data.reservationsByMonth.length > 0 && (
          <SimpleCountLineChart
            title="Reservation trend"
            testId="chart-fleet-reservations"
            valueLabel="Reservations"
            data={data.reservationsByMonth.map((m) => ({
              label: m.month.includes("-") ? m.month.split("-")[1] : m.month,
              value: m.count,
            }))}
          />
        )}
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Vehicle Inventory</CardTitle>          <CardTitle className="text-xs sm:text-sm font-medium">Vehicle Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vehicle</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Mileage</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Fuel</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">License</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedVehicles?.map(vehicle => (
                  <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                    <TableCell className="py-2">
                      <span className="text-xs sm:text-sm font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{vehicle.category}</Badge>
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell className="text-xs py-2 hidden md:table-cell">
                      {vehicle.currentMileage?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell className="text-xs py-2 hidden lg:table-cell">{vehicle.fuelType}</TableCell>
                    <TableCell className="text-xs py-2 hidden sm:table-cell">{vehicle.licensePlate || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Recent Reservations</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <ScrollArea className="w-full h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vehicle</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Purpose</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Start</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedReservations?.slice(0, 20).map(res => (
                  <TableRow key={res.id} data-testid={`row-reservation-${res.id}`}>
                    <TableCell className="text-xs sm:text-sm py-2">{res.vehicleName}</TableCell>
                    <TableCell className="text-xs sm:text-sm py-2">{res.userName}</TableCell>
                    <TableCell className="py-2">{getReservationStatusBadge(res.status)}</TableCell>
                    <TableCell className="text-xs py-2 hidden sm:table-cell max-w-[150px] truncate">{res.purpose}</TableCell>
                    <TableCell className="text-xs py-2 hidden md:table-cell">
                      {new Date(res.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs py-2 hidden md:table-cell">
                      {new Date(res.endDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={detailDialog.open} onOpenChange={() => setDetailDialog({ open: false, type: "", title: "" })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
            <DialogDescription>
              {detailDialog.type === "vehicles" && "Complete list of all fleet vehicles"}
              {detailDialog.type === "available" && "Vehicles currently available for use"}
              {detailDialog.type === "reservations" && "All vehicle reservations"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {detailDialog.type === "vehicles" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Mileage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.detailedVehicles?.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{v.year} {v.make} {v.model}</TableCell>
                      <TableCell><Badge variant="outline">{v.category}</Badge></TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell>{v.currentMileage?.toLocaleString() || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {detailDialog.type === "available" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Fuel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.detailedVehicles?.filter(v => v.status === "available").map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{v.year} {v.make} {v.model}</TableCell>
                      <TableCell><Badge variant="outline">{v.category}</Badge></TableCell>
                      <TableCell>{v.fuelType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {detailDialog.type === "reservations" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.detailedReservations?.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.vehicleName}</TableCell>
                      <TableCell>{r.userName}</TableCell>
                      <TableCell>{getReservationStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
