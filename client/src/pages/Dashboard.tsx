
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
import type { ServiceRequest, Message, Task } from "@shared/schema";

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

  const isLoading = requestsLoading || tasksLoading;

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
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || "User"}
            </p>
          </div>
          <Link href="/new-request">
            <Button data-testid="button-new-request">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Last Service Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-request-${request.id}`}>
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(
                          request.status
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate">
                            {request.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {request.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Link href="/new-request">
              <Button className="w-full justify-start" variant="outline" data-testid="button-create-request">
                <Plus className="w-4 h-4 mr-2" />
                Create New Request
              </Button>
            </Link>
            <Link href="/requests">
              <Button className="w-full justify-start" variant="outline" data-testid="button-view-all">
                <ClipboardList className="w-4 h-4 mr-2" />
                View My Requests
              </Button>
            </Link>
            <Link href="/messages">
              <Button className="w-full justify-start" variant="outline" data-testid="button-view-messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                View Messages
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin/Maintenance view - full dashboard
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || "User"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Tasks Not Started</p>
                <div className="text-2xl font-bold" data-testid="stat-not-started">
                  {notStartedCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">In Progress</p>
                <div className="text-2xl font-bold" data-testid="stat-in-progress">
                  {inProgressCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Completed</p>
                <div className="text-2xl font-bold" data-testid="stat-completed">
                  {completedCount}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Last Service Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-request-${request.id}`}>
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(
                          request.status
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate">
                            {request.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {request.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Calendar</CardTitle>
            <p className="text-xs text-muted-foreground">
              Select a month to filter dashboard data
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Weekly Work</CardTitle>
          <p className="text-xs text-muted-foreground">
            Comparing tasks assigned this week vs last week
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="This Week" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Last Week" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Link href="/requests">
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-all">
              <ClipboardList className="w-4 h-4 mr-2" />
              View All Tasks
            </Button>
          </Link>
          {user?.role === "admin" && (
            <>
              <Link href="/users">
                <Button className="w-full justify-start" variant="outline" data-testid="button-manage-users">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/areas">
                <Button className="w-full justify-start" variant="outline" data-testid="button-manage-areas">
                  <MapPin className="w-4 h-4 mr-2" />
                  Manage Areas
                </Button>
              </Link>
            </>
          )}
          <Link href="/calendar">
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-calendar">
              <Clock className="w-4 h-4 mr-2" />
              View Calendar
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
