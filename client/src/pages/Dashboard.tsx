import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Link } from "wouter";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Wrench,
  Plus,
  MapPin,
  MessageSquare,
  PlayCircle,
  Car,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ServiceRequest, Message, Task, VehicleReservation, Vehicle } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: requests = [], isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: allMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: vehicleReservations = [], isLoading: reservationsLoading } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations/my"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const isLoading = requestsLoading || tasksLoading || reservationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter data based on selected date (month and year)
  const filterByMonth = (items: any[]) => {
    return items.filter((item) => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);
      return (
        itemDate.getMonth() === selectedDate.getMonth() &&
        itemDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  };

  const monthlyTasks = filterByMonth(tasks);
  const monthlyRequests = filterByMonth(requests);

  const notStartedCount = monthlyTasks.filter((t) => t.status === "not_started").length;
  const inProgressCount = monthlyTasks.filter((t) => t.status === "in_progress").length;
  const completedCount = monthlyTasks.filter((t) => t.status === "completed").length;

  const recentRequests = requests
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const recentReservations = vehicleReservations
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle';
  };

  const getReservationStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-blue-500";
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  // Weekly work chart data
  const getWeeklyData = () => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return days.map((day, index) => {
      const currentDay = new Date(currentWeekStart);
      currentDay.setDate(currentWeekStart.getDate() + index);

      const previousDay = new Date(previousWeekStart);
      previousDay.setDate(previousWeekStart.getDate() + index);

      const currentCount = tasks.filter((task) => {
        if (!task.initialDate) return false;
        const taskDate = new Date(task.initialDate);
        return taskDate.toDateString() === currentDay.toDateString();
      }).length;

      const previousCount = tasks.filter((task) => {
        if (!task.initialDate) return false;
        const taskDate = new Date(task.initialDate);
        return taskDate.toDateString() === previousDay.toDateString();
      }).length;

      return {
        day,
        "This Week": currentCount,
        "Last Week": previousCount,
      };
    });
  };

  const weeklyData = getWeeklyData();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-500";
      case "under_review":
        return "bg-blue-500";
      case "converted_to_task":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  // Staff view - simplified dashboard
  if (user?.role === "staff") {
    return (
      <div className="space-y-6 md:space-y-8 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight" data-testid="text-dashboard-title">
              Dashboard
            </h1>
            <p className="text-base text-muted-foreground">
              Welcome back, {user?.firstName || "User"}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link href="/new-request" className="flex-1 sm:flex-initial">
              <Button size="lg" className="w-full" data-testid="button-new-request">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </Link>
            <Link href="/my-reservations" className="flex-1 sm:flex-initial">
              <Button size="lg" className="w-full" variant="outline" data-testid="button-new-car-reservation">
                <Car className="w-4 h-4 mr-2" />
                New Car Reservation
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-base md:text-lg">Last Service Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3 md:px-6 md:pb-6">
            {recentRequests.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-sm md:text-base text-muted-foreground">
                No requests yet
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                  >
                    <div className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-request-${request.id}`}>
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 md:mt-2 flex-shrink-0 ${getStatusColor(
                          request.status
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start md:items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm md:text-base truncate">
                            {request.title}
                          </span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {request.category}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:truncate">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-base md:text-lg">Last Car Reservations</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3 md:px-6 md:pb-6">
            {recentReservations.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-sm md:text-base text-muted-foreground">
                No reservations yet
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {recentReservations.map((reservation) => (
                  <Link
                    key={reservation.id}
                    href={`/my-reservations`}
                  >
                    <div className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-reservation-${reservation.id}`}>
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 md:mt-2 flex-shrink-0 ${getReservationStatusColor(
                          reservation.status
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start md:items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm md:text-base truncate">
                            {getVehicleName(reservation.vehicleId)}
                          </span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {reservation.status}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {reservation.purpose}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {reservation.startDate ? new Date(reservation.startDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        </div>
    );
  }

  // Admin/Maintenance view - full dashboard
  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-base text-muted-foreground">
            Welcome back, {user?.firstName || "User"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pt-3 px-3 md:pb-3 md:pt-4 md:px-4">
            <div className="flex items-center gap-2 md:gap-3 w-full">
              <div className="p-1.5 md:p-2 rounded-lg bg-yellow-500/20 flex-shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Tasks Not Started</p>
                <div className="text-xl md:text-2xl font-bold" data-testid="stat-not-started">
                  {notStartedCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pt-3 px-3 md:pb-3 md:pt-4 md:px-4">
            <div className="flex items-center gap-2 md:gap-3 w-full">
              <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/20 flex-shrink-0">
                <PlayCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">In Progress</p>
                <div className="text-xl md:text-2xl font-bold" data-testid="stat-in-progress">
                  {inProgressCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pt-3 px-3 md:pb-3 md:pt-4 md:px-4">
            <div className="flex items-center gap-2 md:gap-3 w-full">
              <div className="p-1.5 md:p-2 rounded-lg bg-green-500/20 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Completed</p>
                <div className="text-xl md:text-2xl font-bold" data-testid="stat-completed">
                  {completedCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6 md:pb-3">
            <CardTitle className="text-base md:text-lg">Last Service Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3 md:px-6 md:pb-6">
            {recentRequests.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-sm md:text-base text-muted-foreground">
                No requests yet
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                  >
                    <div className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-request-${request.id}`}>
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 md:mt-2 flex-shrink-0 ${getStatusColor(
                          request.status
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start md:items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm md:text-base truncate">
                            {request.title}
                          </span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {request.category}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:truncate">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6 md:pb-3">
            <CardTitle className="text-base md:text-lg">Calendar</CardTitle>
            <p className="text-xs text-muted-foreground">
              Select a month to filter dashboard data
            </p>
          </CardHeader>
          <CardContent className="flex justify-center px-2 pb-3 md:px-6 md:pb-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border scale-90 md:scale-100"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6 md:pb-3">
          <CardTitle className="text-base md:text-lg">Weekly Work</CardTitle>
          <p className="text-xs text-muted-foreground">
            Comparing tasks assigned this week vs last week
          </p>
        </CardHeader>
        <CardContent className="pt-0 px-2 pb-3 md:px-6 md:pb-6">
          <ResponsiveContainer width="100%" height={240} className="md:h-[280px]">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="This Week" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Last Week" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      </div>
  );
}