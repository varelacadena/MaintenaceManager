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
  FolderKanban,
  ArrowUpRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { ServiceRequest, Task, VehicleReservation, Vehicle, User as UserType, Property, Project } from "@shared/schema";
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
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import FilterCard from "@/components/dashboard/FilterCard";
import TaskCard from "@/components/dashboard/TaskCard";
import TaskDetailDrawer from "@/components/dashboard/TaskDetailDrawer";
import EmptyState from "@/components/dashboard/EmptyState";
import EmergencyContactBanner from "@/components/EmergencyContactBanner";
import { isToday, isPast, parseISO, startOfDay, format, isSameDay } from "date-fns";

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
  const [startDateTime, setStartDateTime] = useState<Date | undefined>(undefined);
  const [endDateTime, setEndDateTime] = useState<Date | undefined>(undefined);
  const [passengerCount, setPassengerCount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

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

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: user?.role === "admin",
  });

  const projectStats = useMemo(() => {
    const inProgress = projects.filter(p => p.status === "in_progress").length;
    const planning = projects.filter(p => p.status === "planning").length;
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);
    const highPriority = projects.filter(p => (p.priority === "high" || p.priority === "critical") && p.status !== "completed").length;
    return { total: projects.length, inProgress, planning, totalBudget, highPriority };
  }, [projects]);

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
      setStartDateTime(undefined);
      setEndDateTime(undefined);
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
    if (!startDateTime || !endDateTime || !passengerCount || !purpose) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();

    if (startDateTime < now) {
      toast({
        title: "Error",
        description: "Cannot create reservations for past dates",
        variant: "destructive",
      });
      return;
    }

    if (endDateTime <= startDateTime) {
      toast({
        title: "Error",
        description: "Return time must be after pickup time",
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

  // Filter tasks for students - only show tasks assigned to them or student_pool AND only for TODAY
  const studentTodayTasks = useMemo(() => {
    if (user?.role !== "student") return tasks;
    
    const today = new Date();
    
    return tasks.filter((t) => {
      // Only show tasks assigned to this student or to the student pool
      const isAssignedToMe = t.assignedToId === user.id;
      const isStudentPoolTask = t.assignedToId === "student_pool";
      if (!isAssignedToMe && !isStudentPoolTask) return false;
      
      // Only show tasks for today (using isSameDay for better timezone handling)
      if (!t.initialDate) return false;
      return isSameDay(parseISO(t.initialDate as unknown as string), today);
    });
  }, [tasks, user?.role, user?.id]);

  // Use student-filtered tasks for students, all tasks for other roles
  const baseTasks = user?.role === "student" ? studentTodayTasks : tasks;

  const taskCounts = useMemo(() => {
    const today = startOfDay(new Date());
    
    const dueToday = baseTasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.initialDate) return false;
      const taskDate = startOfDay(parseISO(t.initialDate as unknown as string));
      return taskDate.getTime() === today.getTime();
    }).length;

    const overdue = baseTasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.estimatedCompletionDate) return false;
      return isPast(parseISO(t.estimatedCompletionDate as unknown as string));
    }).length;

    const highPriority = baseTasks.filter(
      (t) => t.urgency === "high" && t.status !== "completed"
    ).length;

    const unassigned = baseTasks.filter(
      (t) => !t.assignedToId && t.status !== "completed"
    ).length;

    const completedToday = baseTasks.filter((t) => {
      if (t.status !== "completed") return false;
      if (!t.actualCompletionDate) return false;
      return isToday(parseISO(t.actualCompletionDate as unknown as string));
    }).length;

    return { dueToday, overdue, highPriority, unassigned, completedToday };
  }, [baseTasks]);

  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    
    let filtered = [...baseTasks];

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
        filtered = [...baseTasks].filter((t) => {
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
  }, [baseTasks, activeFilter, showCompleted]);

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

        <EmergencyContactBanner />

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
              <div className="space-y-2">
                <Label htmlFor="purpose">Trip Purpose *</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Client meeting in Washington"
                  data-testid="input-purpose"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passengerCount">Number of Passengers *</Label>
                <Input
                  id="passengerCount"
                  type="number"
                  min="1"
                  max="50"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  placeholder="Enter number of passengers"
                  data-testid="input-passenger-count"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Pickup Date & Time *
                </Label>
                <DateTimePicker
                  value={startDateTime}
                  onChange={(date) => {
                    setStartDateTime(date);
                    if (date && (!endDateTime || endDateTime < date)) {
                      const defaultEnd = new Date(date);
                      defaultEnd.setHours(defaultEnd.getHours() + 2);
                      setEndDateTime(defaultEnd);
                    }
                  }}
                  minDate={new Date()}
                  placeholder="Select pickup date and time"
                  data-testid="input-start-datetime"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Return Date & Time *
                </Label>
                <DateTimePicker
                  value={endDateTime}
                  onChange={setEndDateTime}
                  minDate={startDateTime || new Date()}
                  placeholder="Select return date and time"
                  data-testid="input-end-datetime"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements or additional information..."
                  data-testid="input-notes"
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

  // Student Dashboard - shows only student tasks
  if (user?.role === "student") {
    return (
      <div className="space-y-6 pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome, {user?.firstName || "Student"}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
              <CardTitle className="text-lg">Today's Tasks</CardTitle>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No tasks for today"
                description="You don't have any student tasks assigned for today"
                testId="empty-student-tasks"
              />
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedUser={getUserById(task.assignedToId)}
                    property={getPropertyById(task.propertyId)}
                    onStatusChange={handleStatusChange}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <TaskDetailDrawer
          task={selectedTask}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          assignedUser={selectedTask ? getUserById(selectedTask.assignedToId) : null}
          property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  // Technician Dashboard - shows only technician tasks
  if (user?.role === "technician") {
    return (
      <div className="space-y-6 pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome, {user?.firstName || "Technician"}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
              <CardTitle className="text-lg">My Technician Tasks</CardTitle>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No tasks assigned"
                description="You don't have any technician tasks at the moment"
                testId="empty-technician-tasks"
              />
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedUser={getUserById(task.assignedToId)}
                    property={getPropertyById(task.propertyId)}
                    onStatusChange={handleStatusChange}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <TaskDetailDrawer
          task={selectedTask}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          assignedUser={selectedTask ? getUserById(selectedTask.assignedToId) : null}
          property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
          onStatusChange={handleStatusChange}
        />
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

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800" data-testid="card-projects-summary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Projects Overview</CardTitle>
            </div>
            <Link href="/projects">
              <Button variant="outline" size="sm" data-testid="button-view-projects">
                View All
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-indigo-600">{projectStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Projects</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">{projectStats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-orange-600">{projectStats.highPriority}</p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">
                ${projectStats.totalBudget.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
