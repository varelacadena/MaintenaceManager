import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Task, Area, User, Property, Vendor, Project } from "@shared/schema";
import {
  unifiedStatusConfig,
  projectStatusMapping,
  type StatusType,
  type WorkItem,
} from "./constants";

export function useWork() {
  const { user } = useAuth();
  const navigate = useLocation()[1];
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    unifiedStatusConfig.forEach(s => { initial[s.key] = true; });
    return initial;
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedParentTasks, setExpandedParentTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">("tasks");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: StatusType;
    task: Task;
  } | null>(null);
  const [reviewEstimatesTaskId, setReviewEstimatesTaskId] = useState<string | null>(null);
  const [summaryTaskId, setSummaryTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const panelOpen = !!selectedTaskId && !isMobile;

  useEffect(() => {
    if (panelOpen) {
      setPanelMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelVisible(true));
      });
    } else {
      setPanelVisible(false);
      const timer = setTimeout(() => setPanelMounted(false), 280);
      return () => clearTimeout(timer);
    }
  }, [panelOpen]);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0,
  });

  const isAdmin = user?.role === "admin";

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAdmin,
  });

  const { data: areas } = useQuery<Area[]>({ queryKey: ["/api/areas"] });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: vendors } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
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
      taskId: string;
      newStatus: StatusType;
      onHoldReason?: string;
      requestId?: string | null;
      taskName?: string;
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
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      }, 300);
    },
    onError: async (error: any) => {
      let description = "Failed to update task status.";
      if (error?.message) description = error.message;
      toast({ title: "Error", description, variant: "destructive" });
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated", description: "Status changed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project status.", variant: "destructive" });
    },
  });

  const handleProjectStatusChange = (projectId: string, status: string) => {
    updateProjectStatusMutation.mutate({ projectId, status });
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    const u = allUsers?.find((u: any) => u.id === userId);
    if (!u) return "Unknown";
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    return u.username || "Unknown";
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p: any) => p.id === propertyId)?.name || null;
  };

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p: any) => p.id === propertyId) || null;
  };

  const handleStatusChange = (taskId: string, newStatus: StatusType) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === newStatus) return;
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

  const handleInlineEdit = (taskId: string, field: string, value: string) => {
    updateTaskMutation.mutate({ taskId, data: { [field]: value } });
  };

  const handleSelectTask = (taskId: string) => {
    if (isMobile) {
      navigate(`/tasks/${taskId}`);
    } else {
      setSelectedTaskId((prev) => (prev === taskId ? prev : taskId));
    }
  };

  const handleUrgencyChange = (taskId: string, urgency: string) => {
    updateTaskMutation.mutate({ taskId, data: { urgency } });
  };

  const handleAssigneeChange = (taskId: string, assignedToId: string) => {
    const data: Record<string, any> = {};
    if (assignedToId === "__none__") {
      data.assignedToId = null;
    } else {
      data.assignedToId = assignedToId;
    }
    updateTaskMutation.mutate({ taskId, data });
  };

  const handlePropertyChange = (taskId: string, propertyId: string) => {
    const data: Record<string, any> = {};
    if (propertyId === "__none__") {
      data.propertyId = null;
    } else {
      data.propertyId = propertyId;
    }
    updateTaskMutation.mutate({ taskId, data });
  };

  const handleTaskTypeChange = (taskId: string, taskType: string) => {
    updateTaskMutation.mutate({ taskId, data: { taskType } });
  };

  const toggleGroup = (statusKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [statusKey]: !prev[statusKey] }));
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
  };

  const toggleParentTaskExpanded = (taskId: string) => {
    setExpandedParentTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  const subTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks?.forEach((t) => {
      if (t.parentTaskId) {
        if (!map[t.parentTaskId]) map[t.parentTaskId] = [];
        map[t.parentTaskId].push(t);
      }
    });
    return map;
  }, [tasks]);

  const standaloneTasks = useMemo(
    () => tasks?.filter((t) => !t.projectId && !t.parentTaskId) || [],
    [tasks]
  );

  const projectTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks?.forEach((t) => {
      if (t.projectId) {
        if (!map[t.projectId]) map[t.projectId] = [];
        map[t.projectId].push(t);
      }
    });
    return map;
  }, [tasks]);

  const filteredStandaloneTasks = useMemo(() => {
    let filtered = standaloneTasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [standaloneTasks, searchQuery]);

  const filteredProjects = useMemo(() => {
    let filtered = projects || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [projects, searchQuery]);

  const projectsTabFiltered = useMemo(() => {
    let filtered = projects || [];
    if (projectSearchQuery) {
      const q = projectSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    if (projectStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === projectStatusFilter);
    }
    return filtered;
  }, [projects, projectSearchQuery, projectStatusFilter]);

  const unifiedGroups = useMemo(() => {
    const groups: Record<string, WorkItem[]> = {};
    unifiedStatusConfig.forEach((s) => { groups[s.key] = []; });
    filteredStandaloneTasks.forEach((task) => {
      const status = task.status === "ready" ? "not_started" : task.status;
      if (groups[status]) groups[status].push({ type: "task", data: task });
    });
    if (!isAdmin) {
      filteredProjects.forEach((project) => {
        const unifiedStatus = projectStatusMapping[project.status] || "not_started";
        if (groups[unifiedStatus]) groups[unifiedStatus].push({ type: "project", data: project });
      });
    }
    return groups;
  }, [filteredStandaloneTasks, filteredProjects, isAdmin]);

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

  const isLoading = tasksLoading || projectsLoading;

  return {
    user, navigate, toast, isMobile, isAdmin, isLoading,
    tasks, projects, areas, allUsers, properties, vendors,
    searchQuery, setSearchQuery,
    activeTab, setActiveTab,
    collapsedGroups, toggleGroup,
    expandedProjects, toggleProjectExpanded,
    expandedParentTasks, toggleParentTaskExpanded,
    projectStatusFilter, setProjectStatusFilter,
    projectSearchQuery, setProjectSearchQuery,
    projectDialogOpen, setProjectDialogOpen,
    reviewEstimatesTaskId, setReviewEstimatesTaskId,
    summaryTaskId, setSummaryTaskId,
    selectedTaskId, setSelectedTaskId,
    isPanelFullscreen, setIsPanelFullscreen,
    panelMounted, panelVisible,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason,
    updateTaskStatusMutation,
    handleStatusChange, handleHoldReasonSubmit, handleInlineEdit,
    handleSelectTask, handleUrgencyChange, handleAssigneeChange,
    handlePropertyChange, handleTaskTypeChange,
    handleProjectStatusChange,
    getAssigneeName, getPropertyName, getPropertyById,
    subTasksMap, standaloneTasks, projectTasksMap,
    filteredStandaloneTasks, filteredProjects, projectsTabFiltered,
    unifiedGroups, userGroups,
  };
}

export type WorkContext = ReturnType<typeof useWork>;
