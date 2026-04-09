import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Project, Task, Property, Area, User, ProjectComment, Upload } from "@shared/schema";
import { format } from "date-fns";
import { getAvatarColor } from "@/utils/taskUtils";

export type StatusType = "not_started" | "needs_estimate" | "waiting_approval" | "ready" | "in_progress" | "on_hold" | "completed";

const editProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  budgetAmount: z.coerce.number().default(0),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  propertyId: z.string().nullable().optional(),
  areaId: z.string().nullable().optional(),
});

export type EditProjectFormValues = z.infer<typeof editProjectSchema>;

export interface ProjectAnalytics {
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

export function useProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);
  const [reviewEstimatesTaskId, setReviewEstimatesTaskId] = useState<string | null>(null);
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [rightTab, setRightTab] = useState("activity");
  const activityEndRef = useRef<HTMLDivElement>(null);
  const projectId = params?.id || "";
  const isAdmin = user?.role === "admin";

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: !!projectId,
  });

  const { data: analytics } = useQuery<ProjectAnalytics>({
    queryKey: ["/api/projects", projectId, "analytics"],
    enabled: !!projectId,
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: comments } = useQuery<ProjectComment[]>({
    queryKey: ["/api/projects", projectId, "comments"],
    enabled: !!projectId,
  });

  const { data: projectUploads } = useQuery<Upload[]>({
    queryKey: ["/api/projects", projectId, "uploads"],
    enabled: !!projectId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; isSystem?: boolean }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/comments`, data);
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comments"] });
      setTimeout(() => {
        activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" });
    },
  });

  const uploadToProjectMutation = useMutation({
    mutationFn: async (data: { fileName: string; fileType: string; objectUrl: string; objectPath?: string; projectCommentId?: string }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/uploads`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "uploads"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload file.", variant: "destructive" });
    },
  });

  const handleCommentSubmit = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addCommentMutation.mutate({ content: trimmed });
  };

  const handleFileAttachToComment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx,.xlsx,.csv,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const res = await apiRequest("POST", "/api/objects/upload", {});
        const { uploadURL, objectPath } = await res.json();

        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        const commentRes = await apiRequest("POST", `/api/projects/${projectId}/comments`, {
          content: commentText.trim() || `Shared a file: ${file.name}`,
        });
        const comment = await commentRes.json();

        await apiRequest("POST", `/api/projects/${projectId}/uploads`, {
          fileName: file.name,
          fileType: file.type,
          objectUrl: uploadURL.split("?")[0],
          objectPath,
          projectCommentId: comment.id,
        });

        setCommentText("");
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "uploads"] });
        toast({ title: "File shared", description: `${file.name} has been attached.` });
        setTimeout(() => {
          activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (error) {
        toast({ title: "Error", description: "Failed to attach file.", variant: "destructive" });
      }
    };
    input.click();
  };

  const handleDirectFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx,.xlsx,.csv,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const res = await apiRequest("POST", "/api/objects/upload", {});
        const { uploadURL, objectPath } = await res.json();

        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        uploadToProjectMutation.mutate({
          fileName: file.name,
          fileType: file.type,
          objectUrl: uploadURL.split("?")[0],
          objectPath,
        });

        toast({ title: "File uploaded", description: `${file.name} has been uploaded.` });
      } catch (error) {
        toast({ title: "Error", description: "Failed to initiate upload.", variant: "destructive" });
      }
    };
    input.click();
  };

  const adminUsers = allUsers?.filter((u) => u.role === "admin") || [];
  const technicianUsers = allUsers?.filter((u) => u.role === "technician") || [];
  const staffUsers = allUsers?.filter((u) => u.role === "staff") || [];
  const studentUsers = allUsers?.filter((u) => u.role === "student") || [];
  const userGroups = [
    { label: "Admins", items: adminUsers },
    { label: "Technicians", items: technicianUsers },
    { label: "Staff", items: staffUsers },
    { label: "Students", items: studentUsers },
  ].filter(group => group.items.length > 0);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({
      taskId, newStatus, onHoldReason, requestId, taskName,
    }: {
      taskId: string; newStatus: StatusType; onHoldReason?: string; requestId?: string | null; taskName?: string;
    }) => {
      const updateData: any = { status: newStatus };
      if (newStatus === "on_hold" && onHoldReason) {
        updateData.onHoldReason = onHoldReason;
      }
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updateData);
      if (newStatus === "on_hold" && onHoldReason && requestId) {
        await apiRequest("POST", "/api/messages", {
          requestId,
          content: `Your task "${taskName}" has been placed on hold.\n\nReason: ${onHoldReason}`,
        });
      }
      return response;
    },
    onSuccess: () => {
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      setPendingStatusChange(null);
      toast({ title: "Task updated", description: "Task status has been updated successfully." });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update task status.", variant: "destructive" });
    },
  });

  const handleStatusChange = (taskId: string, newStatus: StatusType) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    if (newStatus === "on_hold" && task.requestId) {
      setPendingStatusChange({ taskId, newStatus, task });
      setIsHoldReasonDialogOpen(true);
    } else {
      updateTaskStatusMutation.mutate({ taskId, newStatus });
    }
  };

  const handleHoldReasonSubmit = () => {
    if (!holdReason.trim()) {
      toast({ title: "Please provide a reason", description: "A reason is required when placing a task on hold.", variant: "destructive" });
      return;
    }
    if (pendingStatusChange) {
      updateTaskStatusMutation.mutate({
        taskId: pendingStatusChange.taskId,
        newStatus: pendingStatusChange.newStatus,
        onHoldReason: holdReason,
        requestId: pendingStatusChange.task.requestId,
        taskName: pendingStatusChange.task.name,
      });
    }
  };

  const handleUrgencyChange = (taskId: string, urgency: string) => {
    updateTaskMutation.mutate({ taskId, data: { urgency } });
  };

  const handleAssigneeChange = (taskId: string, assignedToId: string) => {
    updateTaskMutation.mutate({ taskId, data: { assignedToId: assignedToId === "__none__" ? null : assignedToId } });
  };

  const handlePropertyChange = (taskId: string, propertyId: string) => {
    updateTaskMutation.mutate({ taskId, data: { propertyId: propertyId === "__none__" ? null : propertyId } });
  };

  const handleTaskTypeChange = (taskId: string, taskType: string) => {
    updateTaskMutation.mutate({ taskId, data: { taskType } });
  };

  const handleInlineEdit = (taskId: string, field: string, value: string) => {
    updateTaskMutation.mutate({ taskId, data: { [field]: value } });
  };

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
      propertyId: project.propertyId || null,
      areaId: project.areaId || null,
    } : undefined,
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
      setEditDialogOpen(false);
      toast({ title: "Project updated successfully" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }, 300);
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
      setLocation("/work");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find(p => p.id === propertyId)?.name;
  };

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return null;
    return areas?.find(a => a.id === areaId)?.name;
  };

  const taskProgress = analytics?.taskStats.total
    ? Math.round((analytics.taskStats.completed / analytics.taskStats.total) * 100)
    : 0;

  const isOverdue = project?.targetEndDate
    && !["completed", "cancelled"].includes(project.status)
    && new Date(project.targetEndDate) < new Date();

  const daysLeft = project?.targetEndDate
    ? Math.ceil((new Date(project.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const commentsByDate = (comments || []).reduce<Record<string, ProjectComment[]>>((acc, comment) => {
    const dateKey = comment.createdAt ? format(new Date(comment.createdAt), "MMM d") : "Unknown";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(comment);
    return acc;
  }, {});

  const getSenderInfo = (senderId: string) => {
    const u = allUsers?.find(u => u.id === senderId);
    if (!u) return { name: "Unknown", initials: "?" };
    const name = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username || "Unknown";
    const initials = u.firstName && u.lastName ? `${u.firstName[0]}${u.lastName[0]}` : (u.username?.[0] || "?");
    return { name, initials: initials.toUpperCase() };
  };

  const imageUploads = (projectUploads || []).filter(u => u.fileType?.startsWith("image/"));
  const fileUploads = (projectUploads || []).filter(u => !u.fileType?.startsWith("image/"));

  const getCommentAttachments = (commentId: string) => {
    return (projectUploads || []).filter(u => u.projectCommentId === commentId);
  };

  const getImageUrl = (upload: Upload) => {
    if (upload.objectPath) {
      return `/api/objects/image?path=${encodeURIComponent(upload.objectPath)}`;
    }
    return upload.objectUrl;
  };

  return {
    user,
    isMobile,
    isAdmin,
    isLoading,
    projectId,
    project,
    tasks,
    analytics,
    properties,
    areas,
    allUsers,
    comments,
    projectUploads,
    editDialogOpen, setEditDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason,
    pendingStatusChange, setPendingStatusChange,
    reviewEstimatesTaskId, setReviewEstimatesTaskId,
    summaryTaskId, setSummaryTaskId,
    commentText, setCommentText,
    rightTab, setRightTab,
    activityEndRef,
    userGroups,
    editForm,
    addCommentMutation,
    uploadToProjectMutation,
    updateTaskMutation,
    updateTaskStatusMutation,
    updateProjectMutation,
    deleteProjectMutation,
    handleCommentSubmit,
    handleFileAttachToComment,
    handleDirectFileUpload,
    handleStatusChange,
    handleHoldReasonSubmit,
    handleUrgencyChange,
    handleAssigneeChange,
    handlePropertyChange,
    handleTaskTypeChange,
    handleInlineEdit,
    getPropertyName,
    getAreaName,
    taskProgress,
    isOverdue,
    daysLeft,
    commentsByDate,
    getSenderInfo,
    imageUploads,
    fileUploads,
    getCommentAttachments,
    getImageUrl,
  };
}

export type ProjectDetailContext = ReturnType<typeof useProjectDetail>;
