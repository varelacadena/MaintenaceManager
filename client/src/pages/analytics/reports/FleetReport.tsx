import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Car, Calendar, DollarSign, CheckCircle2, XCircle, Wrench, Clock, TrendingUp } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

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

const STATUS_COLORS: Record<string, string> = {
  available: "hsl(142, 76%, 36%)",
  in_use: "hsl(221, 83%, 53%)",
  needs_maintenance: "hsl(0, 84%, 60%)",
  needs_cleaning: "hsl(45, 93%, 47%)",
};

export default function FleetReport() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
    areaId: "",
    technicianId: "",
    status: "",
    urgency: "",
    spaceId: "",
  });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: string; title: string }>({
    open: false,
    type: "",
    title: "",
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const { data, isLoading } = useQuery<FleetOverview>({
    queryKey: ["/api/analytics/fleet", filters],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/fleet?${buildQueryString()}`);
      if (!response.ok) throw new Error("Failed to fetch fleet analytics");
      return response.json();
    },
  });

  const handleExport = (format: string) => {
    const queryString = buildQueryString();
    window.open(`/api/analytics/export?type=fleet-detailed&format=${format}&${queryString}`, "_blank");
  };

  const openDetailDialog = (type: string, title: string) => {
    setDetailDialog({ open: true, type, title });
  };

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

  const statusData = data?.byStatus?.map(s => ({
    name: s.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: s.count,
    color: STATUS_COLORS[s.status] || "#9ca3af",
  })) || [];

  const categoryData = data?.byCategory || [];
  const trendData = data?.reservationsByMonth?.map(m => ({
    month: m.month.split('-')[1],
    Reservations: m.count,
  })) || [];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string }> = {
      available: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      in_use: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      needs_maintenance: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      needs_cleaning: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    };
    const config = statusMap[status] || { className: "" };
    return (
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${config.className}`}>
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
      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${config.className}`}>
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
        exportOptions={["pdf", "xlsx"]}
      />

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
          title="Utilization"
          value={`${data?.avgUtilizationRate || 0}%`}
          icon={TrendingUp}
          variant={data?.avgUtilizationRate && data.avgUtilizationRate >= 70 ? "success" : "warning"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">By Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={60} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Reservation Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Reservations" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Vehicle Inventory</CardTitle>
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
    </div>
  );
}
