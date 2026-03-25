import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2,
  Plus,
  Car,
  ClipboardList,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { ServiceRequest, Task, VehicleReservation, User as UserType, Property, Project } from "@shared/schema";
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
import TaskCard from "@/components/dashboard/TaskCard";
import TaskDetailDrawer from "@/components/dashboard/TaskDetailDrawer";
import EmptyState from "@/components/dashboard/EmptyState";
import EmergencyContactBanner from "@/components/EmergencyContactBanner";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { parseISO, format, isSameDay } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
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

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: user?.role === "admin",
  });

  type AiStats = {
    pending: number;
    approved: number;
    rejected: number;
    autoApplied: number;
    total: number;
    acceptanceRate: number;
    pendingByAction?: Record<string, number>;
  };

  const { data: aiStats } = useQuery<AiStats>({
    queryKey: ["/api/ai-stats"],
    enabled: user?.role === "admin",
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task["status"] }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task status has been changed",
      });
    },
    onError: async (error: any) => {
      let message = "Failed to update task status";
      if (error?.message) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
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

  const handleStatusChange = (taskId: string, status: Task["status"]) => {
    statusMutation.mutate({ taskId, status });
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
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
      <div className="space-y-3 md:space-y-4 pb-6">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {user?.firstName || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
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
                <Button variant="ghost" className="mt-2" onClick={() => setLocation("/my-reservations")} data-testid="button-view-all-reservations">View All</Button>
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

  // Student Dashboard - simplified view with just today's task list
  if (user?.role === "student") {
    const studentTasks = baseTasks.filter((t) =>
      showCompleted ? true : t.status !== "completed"
    ).sort((a, b) => {
      const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if ((urgencyOrder[a.urgency] ?? 2) !== (urgencyOrder[b.urgency] ?? 2)) {
        return (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      }
      if (!a.estimatedCompletionDate) return 1;
      if (!b.estimatedCompletionDate) return -1;
      return new Date(a.estimatedCompletionDate as unknown as string).getTime() -
             new Date(b.estimatedCompletionDate as unknown as string).getTime();
    });

    const activeCount = baseTasks.filter((t) => t.status !== "completed").length;

    return (
      <div className="space-y-4 pb-6">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome, {user?.firstName || "Student"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground" data-testid="text-active-task-count">
            {activeCount} {activeCount === 1 ? "task" : "tasks"} for today
          </p>
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

        {studentTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CheckCircle2}
                title="No tasks for today"
                description="You don't have any tasks assigned for today"
                testId="empty-student-tasks"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {studentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={getUserById(task.assignedToId)}
                property={getPropertyById(task.propertyId)}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        <TaskDetailDrawer
          task={selectedTask}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          assignee={selectedTask ? getUserById(selectedTask.assignedToId) : null}
          property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  // Technician Dashboard - simplified view with just task list
  if (user?.role === "technician") {
    const techTasks = baseTasks.filter((t) =>
      showCompleted ? true : t.status !== "completed"
    ).sort((a, b) => {
      const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if ((urgencyOrder[a.urgency] ?? 2) !== (urgencyOrder[b.urgency] ?? 2)) {
        return (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      }
      if (!a.estimatedCompletionDate) return 1;
      if (!b.estimatedCompletionDate) return -1;
      return new Date(a.estimatedCompletionDate as unknown as string).getTime() -
             new Date(b.estimatedCompletionDate as unknown as string).getTime();
    });

    const activeCount = baseTasks.filter((t) => t.status !== "completed").length;

    return (
      <div className="space-y-4 pb-6">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Welcome, {user?.firstName || "Technician"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground" data-testid="text-active-task-count">
            {activeCount} active {activeCount === 1 ? "task" : "tasks"}
          </p>
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

        {techTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CheckCircle2}
                title="No tasks assigned"
                description="You don't have any tasks at the moment"
                testId="empty-technician-tasks"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {techTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={getUserById(task.assignedToId)}
                property={getPropertyById(task.propertyId)}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        <TaskDetailDrawer
          task={selectedTask}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          assignee={selectedTask ? getUserById(selectedTask.assignedToId) : null}
          property={selectedTask ? getPropertyById(selectedTask.propertyId) : null}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  return (
    <AdminDashboard
      tasks={baseTasks}
      users={users}
      properties={properties}
      projects={projects}
      requests={requests}
      vehicleReservations={vehicleReservations}
      aiStats={aiStats}
      onStatusChange={handleStatusChange}
      statusMutationPending={statusMutation.isPending}
    />
  );
}
