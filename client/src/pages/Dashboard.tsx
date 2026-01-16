import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  Car,
  ClipboardList,
  List,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { ServiceRequest, Task, VehicleReservation, Vehicle, User as UserType, Property } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import FilterCard from "@/components/dashboard/FilterCard";
import TaskCard from "@/components/dashboard/TaskCard";
import TaskDetailDrawer from "@/components/dashboard/TaskDetailDrawer";
import EmptyState from "@/components/dashboard/EmptyState";
import { isToday, isPast, parseISO, startOfDay, format } from "date-fns";

type FilterType = "due_today" | "overdue" | "high_priority" | "unassigned" | "completed_today" | "all";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [activeFilter, setActiveFilter] = useState<FilterType>("due_today");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [passengerCount, setPassengerCount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isTomorrow = (dateString: string) => {
    if (!dateString) return false;
    const selected = new Date(dateString + "T00:00:00");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === tomorrow.getTime();
  };

  const getMinTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    if (isTomorrow(startDate) && currentHour >= 16) {
      return "09:00";
    }
    return "00:00";
  };

  const { data: requests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: vehicleReservations = [], isLoading: reservationsLoading } = useQuery<VehicleReservation[]>({
    queryKey: ["/api/vehicle-reservations/my"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: createDialogOpen,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task["status"] }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task status has been changed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/vehicle-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create reservation");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-reservations/my"] });
      toast({
        title: "Success",
        description: "Reservation request submitted successfully",
      });
      setCreateDialogOpen(false);
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setPassengerCount("");
      setPurpose("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateReservation = () => {
    if (!startDate || !startTime || !endDate || !endTime || !passengerCount || !purpose) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const today = getTodayDateString();
    if (startDate < today) {
      toast({
        title: "Error",
        description: "Cannot create reservations for past dates",
        variant: "destructive",
      });
      return;
    }

    if (isTomorrow(startDate) && startTime < "09:00") {
      toast({
        title: "Error",
        description: "Reservations for tomorrow must start at or after 9:00 AM",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      toast({
        title: "Error",
        description: "End date/time must be after start date/time",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      passengerCount: parseInt(passengerCount),
      purpose,
      notes,
      status: "pending",
    });
  };

  const getUserById = (id: string | null) => users.find((u) => u.id === id) || null;
  const getPropertyById = (id: string | null) => properties.find((p) => p.id === id) || null;

  const taskCounts = useMemo(() => {
    const today = startOfDay(new Date());
    
    const dueToday = tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.initialDate) return false;
      const taskDate = startOfDay(parseISO(t.initialDate as unknown as string));
      return taskDate.getTime() === today.getTime();
    }).length;

    const overdue = tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.estimatedCompletionDate) return false;
      return isPast(parseISO(t.estimatedCompletionDate as unknown as string));
    }).length;

    const highPriority = tasks.filter(
      (t) => t.urgency === "high" && t.status !== "completed"
    ).length;

    const unassigned = tasks.filter(
      (t) => !t.assignedToId && t.status !== "completed"
    ).length;

    const completedToday = tasks.filter((t) => {
      if (t.status !== "completed") return false;
      if (!t.actualCompletionDate) return false;
      return isToday(parseISO(t.actualCompletionDate as unknown as string));
    }).length;

    return { dueToday, overdue, highPriority, unassigned, completedToday };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    
    let filtered = [...tasks];

    if (!showCompleted) {
      filtered = filtered.filter((t) => t.status !== "completed");
    }

    switch (activeFilter) {
      case "due_today":
        filtered = filtered.filter((t) => {
          if (!t.initialDate) return false;
          const taskDate = startOfDay(parseISO(t.initialDate as unknown as string));
          return taskDate.getTime() === today.getTime();
        });
        break;
      case "overdue":
        filtered = filtered.filter((t) => {
          if (t.status === "completed") return false;
          if (!t.estimatedCompletionDate) return false;
          return isPast(parseISO(t.estimatedCompletionDate as unknown as string));
        });
        break;
      case "high_priority":
        filtered = filtered.filter((t) => t.urgency === "high" && t.status !== "completed");
        break;
      case "unassigned":
        filtered = filtered.filter((t) => !t.assignedToId && t.status !== "completed");
        break;
      case "completed_today":
        filtered = [...tasks].filter((t) => {
          if (t.status !== "completed") return false;
          if (!t.actualCompletionDate) return false;
          return isToday(parseISO(t.actualCompletionDate as unknown as string));
        });
        break;
      case "all":
        break;
    }

    return filtered.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      if (!a.estimatedCompletionDate) return 1;
      if (!b.estimatedCompletionDate) return -1;
      return new Date(a.estimatedCompletionDate as unknown as string).getTime() -
             new Date(b.estimatedCompletionDate as unknown as string).getTime();
    });
  }, [tasks, activeFilter, showCompleted]);

  const handleStatusChange = (taskId: string, status: Task["status"]) => {
    statusMutation.mutate({ taskId, status });
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const getFilterTitle = () => {
    switch (activeFilter) {
      case "due_today": return "Today's Tasks";
      case "overdue": return "Overdue Tasks";
      case "high_priority": return "High Priority Tasks";
      case "unassigned": return "Unassigned Tasks";
      case "completed_today": return "Completed Today";
      case "all": return "All Tasks";
    }
  };

  const isLoading = tasksLoading || reservationsLoading;

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

  const recentRequests = requests
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "under_review": return "bg-blue-500";
      case "converted_to_task": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  if (user?.role === "staff") {
    return (
      <div className="space-y-6 pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {user?.firstName || "User"}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/new-request">
            <Button size="lg" className="w-full sm:w-auto" data-testid="button-new-request">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
          <Button 
            size="lg" 
            className="w-full sm:w-auto" 
            variant="outline" 
            data-testid="button-new-car-reservation"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Car className="w-4 h-4 mr-2" />
            New Car Reservation
          </Button>
        </div>

        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/requests")} data-testid="card-my-requests">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              My Service Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No requests yet"
                description="Submit a service request to get started"
                actionLabel="New Request"
                actionHref="/new-request"
                testId="empty-requests"
              />
            ) : (
              <div className="space-y-2">
                {recentRequests.map((request) => (
                  <Link key={request.id} href={`/requests/${request.id}`}>
                    <div 
                      className="flex items-start gap-3 p-3 rounded-lg border hover-elevate" 
                      data-testid={`card-request-${request.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(request.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : "N/A"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {request.status?.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
                <Button variant="ghost" className="w-full mt-2" onClick={() => setLocation("/requests")}>
                  View All Requests
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/my-reservations")} data-testid="card-my-reservations">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-5 h-5" />
              My Vehicle Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleReservations.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No reservations"
                description="Reserve a vehicle for your upcoming trip"
                actionLabel="New Reservation"
                onAction={() => setCreateDialogOpen(true)}
                testId="empty-reservations"
              />
            ) : (
              <div className="text-center py-4">
                <div className="text-3xl font-bold">{vehicleReservations.length}</div>
                <p className="text-sm text-muted-foreground">Active Reservations</p>
                <Button variant="ghost" className="mt-2">View All</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Reservation</DialogTitle>
              <DialogDescription>
                Reserve a vehicle for your upcoming trip
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengerCount">Number of Passengers *</Label>
                  <Input
                    id="passengerCount"
                    type="number"
                    min="1"
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (isTomorrow(e.target.value) && startTime && startTime < "09:00") {
                        setStartTime("09:00");
                      }
                    }}
                    min={getTodayDateString()}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    min={getMinTime()}
                    required
                  />
                  {isTomorrow(startDate) && (
                    <p className="text-xs text-muted-foreground">
                      Minimum start time for tomorrow: 9:00 AM
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || getTodayDateString()}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Trip to Washington"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateReservation} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Reservation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {user?.firstName || "User"}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks/new">
            <Button data-testid="button-new-task">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <FilterCard
          title="Due Today"
          count={taskCounts.dueToday}
          icon={CalendarDays}
          color="blue"
          isActive={activeFilter === "due_today"}
          onClick={() => setActiveFilter("due_today")}
          testId="filter-due-today"
        />
        <FilterCard
          title="Overdue"
          count={taskCounts.overdue}
          icon={AlertTriangle}
          color="red"
          isActive={activeFilter === "overdue"}
          onClick={() => setActiveFilter("overdue")}
          testId="filter-overdue"
        />
        <FilterCard
          title="High Priority"
          count={taskCounts.highPriority}
          icon={Clock}
          color="orange"
          isActive={activeFilter === "high_priority"}
          onClick={() => setActiveFilter("high_priority")}
          testId="filter-high-priority"
        />
        <FilterCard
          title="Unassigned"
          count={taskCounts.unassigned}
          icon={User}
          color="purple"
          isActive={activeFilter === "unassigned"}
          onClick={() => setActiveFilter("unassigned")}
          testId="filter-unassigned"
        />
        <FilterCard
          title="Completed Today"
          count={taskCounts.completedToday}
          icon={CheckCircle2}
          color="green"
          isActive={activeFilter === "completed_today"}
          onClick={() => setActiveFilter("completed_today")}
          testId="filter-completed-today"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">{getFilterTitle()}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-xs"
                data-testid="toggle-completed"
              >
                {showCompleted ? (
                  <><EyeOff className="w-3 h-3 mr-1" /> Hide Completed</>
                ) : (
                  <><Eye className="w-3 h-3 mr-1" /> Show Completed</>
                )}
              </Button>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "timeline")}>
                <TabsList className="h-8">
                  <TabsTrigger value="list" className="text-xs px-2" data-testid="view-list">
                    <List className="w-3 h-3 mr-1" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs px-2" data-testid="view-timeline">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    Timeline
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={activeFilter === "completed_today" ? "No tasks completed yet" : "No tasks found"}
              description={
                activeFilter === "due_today"
                  ? "Great job! No tasks scheduled for today"
                  : activeFilter === "overdue"
                  ? "All tasks are on track"
                  : activeFilter === "unassigned"
                  ? "All tasks have been assigned"
                  : "Try selecting a different filter"
              }
              actionLabel={activeFilter !== "completed_today" ? "Create Task" : undefined}
              actionHref={activeFilter !== "completed_today" ? "/tasks/new" : undefined}
              testId="empty-tasks"
            />
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={getUserById(task.assignedToId)}
                  property={getPropertyById(task.propertyId)}
                  onStatusChange={handleStatusChange}
                  onViewDetails={handleViewDetails}
                  isPending={statusMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const startHour = task.initialDate
                  ? new Date(task.initialDate as unknown as string).getHours()
                  : 9;
                const widthPercent = Math.min(100, Math.max(20, 30 + Math.random() * 40));
                const leftPercent = Math.max(0, (startHour - 8) * 6.25);

                return (
                  <div
                    key={task.id}
                    className="relative h-12 bg-muted/30 rounded-lg overflow-hidden"
                    onClick={() => handleViewDetails(task)}
                    data-testid={`timeline-task-${task.id}`}
                  >
                    <div
                      className={`absolute top-1 bottom-1 rounded-md px-3 flex items-center cursor-pointer transition-all hover:brightness-95 ${
                        task.urgency === "high"
                          ? "bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500"
                          : task.urgency === "medium"
                          ? "bg-yellow-100 dark:bg-yellow-900/40 border-l-4 border-yellow-500"
                          : "bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500"
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    >
                      <span className="text-xs font-medium truncate">{task.name}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between text-[10px] text-muted-foreground px-1 pt-2">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i}>{8 + i}:00</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card 
          className="hover-elevate cursor-pointer" 
          onClick={() => setLocation("/requests")}
          data-testid="card-recent-requests"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Recent Service Requests
              </span>
              <Badge variant="outline">{requests.filter(r => r.status === "pending").length} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No requests yet"
                description="Service requests will appear here"
                testId="empty-recent-requests"
              />
            ) : (
              <div className="space-y-2">
                {recentRequests.map((request) => (
                  <Link key={request.id} href={`/requests/${request.id}`}>
                    <div 
                      className="flex items-start gap-3 p-2 rounded-lg hover-elevate" 
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`recent-request-${request.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getStatusColor(request.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{request.title}</p>
                        <p className="text-xs text-muted-foreground">{request.createdAt ? format(new Date(request.createdAt), "MMM d") : "N/A"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer" 
          onClick={() => setLocation("/vehicle-reservations")}
          data-testid="card-vehicle-status"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleReservations.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No reservations"
                description="Vehicle reservations will appear here"
                actionLabel="View Fleet"
                actionHref="/vehicles"
                testId="empty-vehicle-reservations"
              />
            ) : (
              <div className="text-center py-4">
                <div className="text-3xl font-bold">{vehicleReservations.length}</div>
                <p className="text-sm text-muted-foreground mb-2">Active Reservations</p>
                <Button variant="ghost" size="sm">Manage Reservations</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        assignee={selectedTask ? getUserById(selectedTask.assignedToId) : null}
        property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTask(null);
        }}
        onStatusChange={handleStatusChange}
        isPending={statusMutation.isPending}
      />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Reservation</DialogTitle>
            <DialogDescription>
              Reserve a vehicle for your upcoming trip
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassengerCount">Number of Passengers *</Label>
                <Input
                  id="adminPassengerCount"
                  type="number"
                  min="1"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminStartDate">Start Date *</Label>
                <Input
                  id="adminStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (isTomorrow(e.target.value) && startTime && startTime < "09:00") {
                      setStartTime("09:00");
                    }
                  }}
                  min={getTodayDateString()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminStartTime">Start Time *</Label>
                <Input
                  id="adminStartTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min={getMinTime()}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminEndDate">End Date *</Label>
                <Input
                  id="adminEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || getTodayDateString()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEndTime">End Time *</Label>
                <Input
                  id="adminEndTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPurpose">Purpose *</Label>
              <Input
                id="adminPurpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Trip to Washington"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateReservation} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
