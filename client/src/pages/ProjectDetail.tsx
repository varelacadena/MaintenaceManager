import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Edit, Trash2, Plus, Calendar, DollarSign, Users, Building2, 
  ClipboardList, FileText, BarChart3, Clock, CheckCircle, XCircle, AlertCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Task, ProjectTeamMember, ProjectVendor, Quote, User, Vendor, Property, Area } from "@shared/schema";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const taskStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

const quoteStatusColors: Record<string, string> = {
  requested: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const editProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  budgetAmount: z.coerce.number().default(0),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

const addTeamMemberSchema = z.object({
  userId: z.string().min(1, "User is required"),
  role: z.enum(["manager", "lead", "technician", "support"]),
  allocationHours: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const addVendorSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  role: z.enum(["primary", "subcontractor", "consultant", "supplier"]),
  notes: z.string().optional(),
});

interface ProjectAnalytics {
  project: Project;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    onHold: number;
  };
  teamCount: number;
  vendorCount: number;
  budget: {
    allocated: number;
    quoted: number;
    actualParts: number;
    remaining: number;
  };
  time: {
    totalMinutes: number;
    totalHours: number;
  };
  quotes: {
    total: number;
    approved: number;
    pending: number;
  };
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addTeamDialogOpen, setAddTeamDialogOpen] = useState(false);
  const [addVendorDialogOpen, setAddVendorDialogOpen] = useState(false);
  const projectId = params?.id || "";

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: !!projectId,
  });

  const { data: teamMembers } = useQuery<ProjectTeamMember[]>({
    queryKey: ["/api/projects", projectId, "team"],
    enabled: !!projectId,
  });

  const { data: projectVendors } = useQuery<ProjectVendor[]>({
    queryKey: ["/api/projects", projectId, "vendors"],
    enabled: !!projectId,
  });

  const { data: quotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: analytics } = useQuery<ProjectAnalytics>({
    queryKey: ["/api/projects", projectId, "analytics"],
    enabled: !!projectId,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const editForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    values: project ? {
      name: project.name,
      description: project.description || "",
      status: project.status as any,
      priority: project.priority as any,
      budgetAmount: project.budgetAmount || 0,
      notes: project.notes || "",
      startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "",
      targetEndDate: project.targetEndDate ? format(new Date(project.targetEndDate), "yyyy-MM-dd") : "",
    } : undefined,
  });

  const teamForm = useForm({
    resolver: zodResolver(addTeamMemberSchema),
    defaultValues: {
      userId: "",
      role: "technician" as const,
      allocationHours: undefined,
      notes: "",
    },
  });

  const vendorForm = useForm({
    resolver: zodResolver(addVendorSchema),
    defaultValues: {
      vendorId: "",
      role: "primary" as const,
      notes: "",
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: EditProjectFormValues) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditDialogOpen(false);
      toast({ title: "Project updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
      setLocation("/projects");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/projects/${projectId}/team`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "analytics"] });
      setAddTeamDialogOpen(false);
      teamForm.reset();
      toast({ title: "Team member added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/project-team-members/${memberId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "analytics"] });
      toast({ title: "Team member removed" });
    },
  });

  const addProjectVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/projects/${projectId}/vendors`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "analytics"] });
      setAddVendorDialogOpen(false);
      vendorForm.reset();
      toast({ title: "Vendor added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeProjectVendorMutation = useMutation({
    mutationFn: async (vendorLinkId: string) => {
      return await apiRequest("DELETE", `/api/project-vendors/${vendorLinkId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "analytics"] });
      toast({ title: "Vendor removed" });
    },
  });

  const projectQuotes = quotes?.filter(q => q.projectId === projectId) || [];

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown";
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find(v => v.id === vendorId);
    return vendor?.name || "Unknown";
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find(p => p.id === propertyId)?.name;
  };

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return null;
    return areas?.find(a => a.id === areaId)?.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-project-name">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[project.status]} variant="secondary">
                {project.status.replace("_", " ")}
              </Badge>
              <Badge className={priorityColors[project.priority]} variant="secondary">
                {project.priority}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-edit-project">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit((data) => updateProjectMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-project-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-edit-project-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-project-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planning">Planning</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-project-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="budgetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Amount</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" data-testid="input-edit-project-budget" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-edit-project-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="targetEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target End Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-edit-project-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-edit-project-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateProjectMutation.isPending} data-testid="button-save-project">
                      {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-project">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Project</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this project? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteProjectMutation.mutate()}
                  disabled={deleteProjectMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {project.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(project.budgetAmount || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.taskStats.completed || 0} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">members assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.time.totalHours || 0}h</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <ClipboardList className="w-4 h-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-vendors">
            <Building2 className="w-4 h-4 mr-2" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="w-4 h-4 mr-2" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Project Tasks</CardTitle>
              <Link href={`/tasks/new?projectId=${projectId}`}>
                <Button size="sm" data-testid="button-add-task">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer" data-testid={`task-row-${task.id}`}>
                        <div className="flex-1">
                          <p className="font-medium">{task.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                        </div>
                        <Badge className={taskStatusColors[task.status]} variant="secondary">
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No tasks assigned to this project yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Dialog open={addTeamDialogOpen} onOpenChange={setAddTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-team-member">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <Form {...teamForm}>
                    <form onSubmit={teamForm.handleSubmit((data) => addTeamMemberMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={teamForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-team-user">
                                  <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users?.filter(u => u.role !== "student").map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-team-role">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="technician">Technician</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamForm.control}
                        name="allocationHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allocated Hours (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="Hours" data-testid="input-team-hours" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setAddTeamDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={addTeamMemberMutation.isPending} data-testid="button-submit-team-member">
                          {addTeamMemberMutation.isPending ? "Adding..." : "Add Member"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {teamMembers && teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`team-member-${member.id}`}>
                      <div>
                        <p className="font-medium">{getUserName(member.userId)}</p>
                        <Badge variant="secondary" className="mt-1">{member.role}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.allocationHours && (
                          <span className="text-sm text-muted-foreground">
                            {member.allocationHours}h allocated
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeTeamMemberMutation.mutate(member.id)}
                          data-testid={`button-remove-team-member-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No team members assigned yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Project Vendors</CardTitle>
              <Dialog open={addVendorDialogOpen} onOpenChange={setAddVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-vendor">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Vendor to Project</DialogTitle>
                  </DialogHeader>
                  <Form {...vendorForm}>
                    <form onSubmit={vendorForm.handleSubmit((data) => addProjectVendorMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={vendorForm.control}
                        name="vendorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-vendor">
                                  <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendors?.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={vendorForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-vendor-role">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="subcontractor">Subcontractor</SelectItem>
                                <SelectItem value="consultant">Consultant</SelectItem>
                                <SelectItem value="supplier">Supplier</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setAddVendorDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={addProjectVendorMutation.isPending} data-testid="button-submit-vendor">
                          {addProjectVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {projectVendors && projectVendors.length > 0 ? (
                <div className="space-y-3">
                  {projectVendors.map((pv) => (
                    <div key={pv.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`project-vendor-${pv.id}`}>
                      <div>
                        <p className="font-medium">{getVendorName(pv.vendorId)}</p>
                        <Badge variant="secondary" className="mt-1">{pv.role}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeProjectVendorMutation.mutate(pv.id)}
                        data-testid={`button-remove-vendor-${pv.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No vendors assigned to this project
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Project Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              {projectQuotes.length > 0 ? (
                <div className="space-y-3">
                  {projectQuotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`quote-row-${quote.id}`}>
                      <div>
                        <p className="font-medium">{getVendorName(quote.vendorId)}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(quote.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={quoteStatusColors[quote.status]} variant="secondary">
                        {quote.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No quotes for this project yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Completed</span>
                    </div>
                    <span className="font-medium">{analytics?.taskStats.completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>In Progress</span>
                    </div>
                    <span className="font-medium">{analytics?.taskStats.inProgress || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                      <span>Not Started</span>
                    </div>
                    <span className="font-medium">{analytics?.taskStats.notStarted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-yellow-500" />
                      <span>On Hold</span>
                    </div>
                    <span className="font-medium">{analytics?.taskStats.onHold || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Allocated Budget</span>
                    <span className="font-medium">${(analytics?.budget.allocated || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Quoted Amount</span>
                    <span className="font-medium">${(analytics?.budget.quoted || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Parts Cost</span>
                    <span className="font-medium">${(analytics?.budget.actualParts || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-medium">Remaining</span>
                    <span className={`font-bold ${(analytics?.budget.remaining || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      ${(analytics?.budget.remaining || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Total Quotes</span>
                    <span className="font-medium">{analytics?.quotes.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Approved</span>
                    <span className="font-medium text-green-500">{analytics?.quotes.approved || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending Review</span>
                    <span className="font-medium text-yellow-500">{analytics?.quotes.pending || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.startDate && (
                    <div className="flex items-center justify-between">
                      <span>Start Date</span>
                      <span className="font-medium">{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {project.targetEndDate && (
                    <div className="flex items-center justify-between">
                      <span>Target End</span>
                      <span className="font-medium">{format(new Date(project.targetEndDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {getPropertyName(project.propertyId) && (
                    <div className="flex items-center justify-between">
                      <span>Property</span>
                      <span className="font-medium">{getPropertyName(project.propertyId)}</span>
                    </div>
                  )}
                  {getAreaName(project.areaId) && (
                    <div className="flex items-center justify-between">
                      <span>Area</span>
                      <span className="font-medium">{getAreaName(project.areaId)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
