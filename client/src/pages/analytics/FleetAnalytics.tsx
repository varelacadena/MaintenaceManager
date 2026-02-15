import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Car, Calendar, DollarSign, CheckCircle2, XCircle, Wrench, Clock, TrendingUp } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import AnalyticsFilters, { FilterState } from "@/components/analytics/AnalyticsFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function FleetAnalytics() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    propertyId: "",
    areaId: "",
    technicianId: "",
    status: "",
    urgency: "",
  });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: string; title: string }>({
    open: false,
    type: "",
    title: "",
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
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
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Fleet Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const statusChartData = data?.byStatus.map(s => ({
    name: s.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: s.count,
    color: STATUS_COLORS[s.status] || "hsl(var(--chart-1))",
  })) || [];

  const categoryChartData = data?.byCategory.map(c => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    count: c.count,
  })) || [];

  const reservationTrendData = data?.reservationsByMonth.map(r => ({
    month: r.month.substring(5),
    reservations: r.count,
  })) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Fleet Analytics</h1>
          <p className="text-sm text-muted-foreground">Vehicle utilization and reservations</p>
        </div>
      </div>

      <AnalyticsFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={handleExport}
        exportOptions={["pdf", "xlsx"]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("vehicles", "Vehicle Fleet Status")}
          data-testid="card-total-vehicles"
        >
          <KpiCard
            title="Total Vehicles"
            value={data?.totalVehicles || 0}
            icon={Car}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("available", "Available Vehicles")}
          data-testid="card-available"
        >
          <KpiCard
            title="Available"
            value={data?.availableVehicles || 0}
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("inuse", "Vehicles In Use")}
          data-testid="card-in-use"
        >
          <KpiCard
            title="In Use"
            value={data?.inUseVehicles || 0}
            icon={Clock}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("maintenance", "Out of Service")}
          data-testid="card-out-of-service"
        >
          <KpiCard
            title="Out of Service"
            value={data?.outOfServiceVehicles || 0}
            icon={Wrench}
            variant={data?.outOfServiceVehicles && data.outOfServiceVehicles > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("reservations", "All Reservations")}
          data-testid="card-total-reservations"
        >
          <KpiCard
            title="Total Reservations"
            value={data?.totalReservations || 0}
            icon={Calendar}
          />
        </div>
        <KpiCard
          title="Active"
          value={data?.activeReservations || 0}
          icon={Clock}
          variant={data?.activeReservations && data.activeReservations > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Completed"
          value={data?.completedReservations || 0}
          icon={CheckCircle2}
          variant="success"
        />
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => openDetailDialog("cost", "Maintenance Costs")}
          data-testid="card-maintenance-cost"
        >
          <KpiCard
            title="Maintenance Cost"
            value={`$${(data?.totalMaintenanceCost || 0).toLocaleString()}`}
            icon={DollarSign}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="chart-vehicle-status">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Vehicle Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-category">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="chart-reservation-trend">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Reservation Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={reservationTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="reservations" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {data?.maintenanceByVehicle && data.maintenanceByVehicle.length > 0 && (
        <Card data-testid="table-maintenance-by-vehicle">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Maintenance Costs by Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs text-right">Maintenance Events</TableHead>
                    <TableHead className="text-xs text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.maintenanceByVehicle.map(vehicle => (
                    <TableRow key={vehicle.vehicleId}>
                      <TableCell className="text-sm py-2 font-medium">{vehicle.vehicleName}</TableCell>
                      <TableCell className="text-sm text-right py-2">{vehicle.count}</TableCell>
                      <TableCell className="text-sm text-right py-2">${vehicle.cost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card data-testid="table-all-reservations">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            All Reservations ({data?.detailedReservations?.length || 0} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ScrollArea className="w-full h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vehicle</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Purpose</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Start</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">End</TableHead>
                  <TableHead className="text-xs text-right hidden lg:table-cell">Passengers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedReservations?.map(reservation => (
                  <TableRow key={reservation.id} data-testid={`row-reservation-${reservation.id}`}>
                    <TableCell className="text-sm py-2 font-medium">{reservation.vehicleName}</TableCell>
                    <TableCell className="text-sm py-2">{reservation.userName}</TableCell>
                    <TableCell className="text-sm py-2 hidden sm:table-cell max-w-[150px] truncate">{reservation.purpose}</TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={
                          reservation.status === "completed" ? "default" 
                          : reservation.status === "active" ? "secondary"
                          : reservation.status === "cancelled" ? "destructive"
                          : "outline"
                        }
                        className="text-xs"
                      >
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-2">{new Date(reservation.startDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs py-2 hidden md:table-cell">{new Date(reservation.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm py-2 text-right hidden lg:table-cell">{reservation.passengerCount}</TableCell>
                  </TableRow>
                ))}
                {(!data?.detailedReservations || data.detailedReservations.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No reservations found in the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Card data-testid="table-all-vehicles">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="w-4 h-4" />
            All Vehicles ({data?.detailedVehicles?.length || 0} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ScrollArea className="w-full h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vehicle ID</TableHead>
                  <TableHead className="text-xs">Make/Model</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Year</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Mileage</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Fuel Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.detailedVehicles?.map(vehicle => (
                  <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                    <TableCell className="text-sm py-2 font-medium">{vehicle.vehicleId}</TableCell>
                    <TableCell className="text-sm py-2">{vehicle.make} {vehicle.model}</TableCell>
                    <TableCell className="text-sm py-2 hidden sm:table-cell">{vehicle.year}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {vehicle.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={
                          vehicle.status === "available" ? "default"
                          : vehicle.status === "in_use" ? "secondary"
                          : "destructive"
                        }
                        className="text-xs"
                      >
                        {vehicle.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2 text-right hidden md:table-cell">
                      {vehicle.currentMileage?.toLocaleString() || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm py-2 hidden lg:table-cell">{vehicle.fuelType}</TableCell>
                  </TableRow>
                ))}
                {(!data?.detailedVehicles || data.detailedVehicles.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No vehicles found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {detailDialog.type === "vehicles" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data?.availableVehicles || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground">In Use</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data?.inUseVehicles || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-muted-foreground">Out of Service</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data?.outOfServiceVehicles || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Utilization Rate</p>
                    <p className="text-2xl font-bold">{data?.avgUtilizationRate || 0}%</p>
                  </div>
                </div>
                <Link href="/vehicles">
                  <Button className="w-full" data-testid="button-view-vehicles">View All Vehicles</Button>
                </Link>
              </div>
            )}
            {detailDialog.type === "reservations" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data?.activeReservations || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data?.completedReservations || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-muted-foreground">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data?.cancelledReservations || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{data?.totalReservations || 0}</p>
                  </div>
                </div>
                <Link href="/vehicle-reservations">
                  <Button className="w-full" data-testid="button-view-reservations">View All Reservations</Button>
                </Link>
              </div>
            )}
            {detailDialog.type === "cost" && data?.maintenanceByVehicle && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Total Maintenance Cost</p>
                  <p className="text-3xl font-bold">${(data?.totalMaintenanceCost || 0).toLocaleString()}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.maintenanceByVehicle.slice(0, 5).map(v => (
                      <TableRow key={v.vehicleId}>
                        <TableCell className="font-medium">{v.vehicleName}</TableCell>
                        <TableCell className="text-right">{v.count}</TableCell>
                        <TableCell className="text-right">${v.cost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
