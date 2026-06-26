import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { buildWorkPath, getTaskIdFromWorkSearch } from "./workTaskUrl";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateTaskAfterMutation, patchTaskInListCaches } from "@/lib/taskQueryInvalidation";
import { exitTo } from "@/lib/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Task, User, Property, Project, Area } from "@shared/schema";
import { matchesDepartmentFilter, UNASSIGNED_DEPARTMENT_ID } from "@/lib/departmentHealth";
import {
  unifiedStatusConfig,
  projectStatusMapping,
  taskToUnifiedGroupKey,
  type StatusType,
  type WorkItem,
} from "./constants";
import { WORK_TASKS_STALE_MS } from "./workConstants";
import { useWorkTasksQuery } from "./useWorkTasksQuery";
import {
  buildDefaultCollapsedGroups,
  loadCollapsedGroupsFromStorage,
  saveCollapsedGroupsToStorage,
} from "./workGroupPrefs";

/** Full Work board state for admins (tasks tab, projects tab, slide panel). */
export function useWorkAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const navigate = setLocation;
  const search = useSearch();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const stored = loadCollapsedGroupsFromStorage();
    if (stored) return stored;
    const initial: Record<string, boolean> = {};
    unifiedStatusConfig.forEach((s) => { initial[s.key] = true; });
    return initial;
  });
  const collapsedDefaultsApplied = useRef(!!loadCollapsedGroupsFromStorage());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedParentTasks, setExpandedParentTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(() =>
    new URLSearchParams(window.location.search).get("departmentId") || ""
  );
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">(() =>
    new URLSearchParams(window.location.search).get("tab") === "projects" ? "projects" : "tasks"
  );
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

  const tasksQuery = useWorkTasksQuery(isAdmin);
  const { tasks, tasksLoading } = tasksQuery;

  useEffect(() => {
    if (new URLSearchParams(search).get("tab") === "projects") {
      setActiveTab("projects");
    }
    setDepartmentFilter(new URLSearchParams(search).get("departmentId") || "");
  }, [search]);

  useEffect(() => {
    if (!isMobile) return;
    const fromUrl = getTaskIdFromWorkSearch(search);
    if (!fromUrl && !selectedTaskId && !panelMounted) return;
    setSelectedTaskId(null);
    setIsPanelFullscreen(false);
    setPanelVisible(false);
    setPanelMounted(false);
    if (fromUrl) {
      exitTo(setLocation, buildWorkPath(null, search));
    }
  }, [isMobile, panelMounted, search, selectedTaskId, setLocation]);

  useEffect(() => {
    if (isMobile) return;
    const fromUrl = getTaskIdFromWorkSearch(search);
    if (!fromUrl) {
      setSelectedTaskId(null);
      return;
    }
    if (tasksLoading) return;
    if (tasks && !tasks.some((t) => t.id === fromUrl)) {
      setSelectedTaskId(null);
      exitTo(setLocation, buildWorkPath(null, search));
      return;
    }
    setSelectedTaskId((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [search, isMobile, tasks, tasksLoading, setLocation]);

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

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: WORK_TASKS_STALE_MS,
    enabled: isAdmin,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users/directory"],
    enabled: isAdmin,
  });
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: isAdmin,
  });
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
    enabled: isAdmin,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: (_result, variables) => {
      patchTaskInListCaches(variables.taskId, variables.data as Partial<Task>);
      invalidateTaskAfterMutation(variables.taskId);
      toast({ title: "Task updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({
      taskId, newStatus, onHoldReason,
    }: {
      taskId: string;
      newStatus: StatusType;
      onHoldReason?: string;
    }) => {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "on_hold" && onHoldReason) {
        payload.onHoldReason = onHoldReason;
      }
      return await apiRequest("PATCH", `/api/tasks/${taskId}/status`, payload);
    },
    onSuccess: (_result, variables) => {
      invalidateTaskAfterMutation(variables.taskId, {
        patch: {
          status: variables.newStatus as Task["status"],
          ...(variables.newStatus === "completed"
            ? { actualCompletionDate: new Date() }
            : {}),
          ...(variables.onHoldReason ? { onHoldReason: variables.onHoldReason } : {}),
        },
      });
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      setPendingStatusChange(null);
      toast({ title: "Task updated", description: "Task status has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status.",
        variant: "destructive",
      });
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

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId)?.name || null;
  };

  const getDepartmentName = (areaId: string | null) => {
    if (!areaId) return null;
    return areas.find((a) => a.id === areaId)?.name || null;
  };

  const getPropertyById = (propertyId: string | null) => {
    if (!propertyId) return null;
    return properties?.find((p) => p.id === propertyId) || null;
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

  const closeHoldReasonDialog = () => {
    setIsHoldReasonDialogOpen(false);
    setHoldReason("");
    setPendingStatusChange(null);
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
      });
    }
  };

  const handleInlineEdit = (taskId: string, field: string, value: string) => {
    updateTaskMutation.mutate({ taskId, data: { [field]: value } });
  };

  const handleSelectTask = (taskId: string) => {
    if (isMobile) {
      setLocation(`/tasks/${taskId}`);
      return;
    }
    setSelectedTaskId((prev) => {
      const next = prev === taskId ? null : taskId;
      setLocation(buildWorkPath(next, search), { replace: true });
      return next;
    });
  };

  const closeTaskPanel = () => {
    setSelectedTaskId(null);
    setIsPanelFullscreen(false);
    exitTo(setLocation, buildWorkPath(null, search));
  };

  const handleUrgencyChange = (taskId: string, urgency: string) => {
    updateTaskMutation.mutate({ taskId, data: { urgency } });
  };

  const handleAssigneeChange = (taskId: string, assignedToId: string) => {
    const data: Record<string, unknown> =
      assignedToId === "__none__" ? { assignedToId: null } : { assignedToId };
    if (isMobile) {
      setSelectedTaskId(null);
      setIsPanelFullscreen(false);
    }
    updateTaskMutation.mutate({ taskId, data });
  };

  const handlePropertyChange = (taskId: string, propertyId: string) => {
    const data: Record<string, unknown> =
      propertyId === "__none__" ? { propertyId: null } : { propertyId };
    updateTaskMutation.mutate({ taskId, data });
  };

  const handleDepartmentChange = (taskId: string, areaId: string) => {
    const data: Record<string, unknown> =
      areaId === "__none__" ? { areaId: null } : { areaId };
    updateTaskMutation.mutate({ taskId, data });
  };

  const setDepartmentFilterAndUrl = (departmentId: string) => {
    setDepartmentFilter(departmentId);
    const params = new URLSearchParams(search);
    if (departmentId) {
      params.set("departmentId", departmentId);
    } else {
      params.delete("departmentId");
    }
    const qs = params.toString();
    navigate(`/work${qs ? `?${qs}` : ""}`, { replace: true });
  };

  const toggleGroup = (statusKey: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [statusKey]: !prev[statusKey] };
      saveCollapsedGroupsToStorage(next);
      return next;
    });
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const toggleParentTaskExpanded = (taskId: string) => {
    setExpandedParentTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
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

  const allProjectTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks?.forEach((t) => {
      if (t.projectId) {
        if (!map[t.projectId]) map[t.projectId] = [];
        map[t.projectId].push(t);
      }
    });
    return map;
  }, [tasks]);

  const projectTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks?.forEach((t) => {
      if (t.projectId && !t.parentTaskId) {
        if (!map[t.projectId]) map[t.projectId] = [];
        map[t.projectId].push(t);
      }
    });
    return map;
  }, [tasks]);

  const filteredStandaloneTasks = useMemo(() => {
    let filtered = standaloneTasks;
    if (departmentFilter) {
      filtered = filtered.filter((t) => matchesDepartmentFilter(t.areaId, departmentFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [standaloneTasks, searchQuery, departmentFilter]);

  const filteredProjects = useMemo(() => {
    let filtered = projects || [];
    if (departmentFilter) {
      filtered = filtered.filter((p) => matchesDepartmentFilter(p.areaId, departmentFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        if (p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
          return true;
        }
        const childTasks = allProjectTasksMap[p.id] || [];
        return childTasks.some(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return filtered;
  }, [projects, searchQuery, allProjectTasksMap]);

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
      const status = taskToUnifiedGroupKey(task.status);
      if (groups[status]) groups[status].push({ type: "task", data: task });
    });
    filteredProjects.forEach((project) => {
      const unifiedStatus = projectStatusMapping[project.status] || "not_started";
      if (groups[unifiedStatus]) groups[unifiedStatus].push({ type: "project", data: project });
    });
    return groups;
  }, [filteredStandaloneTasks, filteredProjects]);

  const boardItemCount = useMemo(
    () =>
      unifiedStatusConfig.reduce(
        (sum, s) => sum + (unifiedGroups[s.key]?.length ?? 0),
        0
      ),
    [unifiedGroups]
  );

  useEffect(() => {
    if (!isAdmin || collapsedDefaultsApplied.current || tasksQuery.tasksLoading) return;
    if (!tasksQuery.tasks) return;

    const counts: Record<string, number> = {};
    unifiedStatusConfig.forEach((s) => {
      counts[s.key] = unifiedGroups[s.key]?.length ?? 0;
    });
    collapsedDefaultsApplied.current = true;
    setCollapsedGroups(buildDefaultCollapsedGroups(counts));
  }, [isAdmin, tasksQuery.tasks, tasksQuery.tasksLoading, unifiedGroups]);

  const adminUsers = allUsers?.filter((u) => u.role === "admin") || [];
  const technicianUsers = allUsers?.filter((u) => u.role === "technician") || [];
  const staffUsers = allUsers?.filter((u) => u.role === "staff") || [];
  const studentUsers = allUsers?.filter((u) => u.role === "student") || [];
  const userGroups = [
    { label: "Admins", items: adminUsers },
    { label: "Technicians", items: technicianUsers },
    { label: "Staff", items: staffUsers },
    { label: "Students", items: studentUsers },
  ].filter((group) => group.items.length > 0);

  const isLoading = (isAdmin && tasksQuery.tasksLoading) || (isAdmin && projectsLoading);

  return {
    user,
    navigate,
    toast,
    isMobile,
    isAdmin,
    isLoading,
    canAccessTasks: isAdmin,
    projects,
    allUsers,
    properties,
    ...tasksQuery,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    collapsedGroups,
    toggleGroup,
    expandedProjects,
    toggleProjectExpanded,
    expandedParentTasks,
    toggleParentTaskExpanded,
    projectStatusFilter,
    setProjectStatusFilter,
    projectSearchQuery,
    setProjectSearchQuery,
    projectDialogOpen,
    setProjectDialogOpen,
    reviewEstimatesTaskId,
    setReviewEstimatesTaskId,
    summaryTaskId,
    setSummaryTaskId,
    selectedTaskId,
    setSelectedTaskId,
    isPanelFullscreen,
    setIsPanelFullscreen,
    panelMounted,
    panelVisible,
    isHoldReasonDialogOpen,
    setIsHoldReasonDialogOpen,
    holdReason,
    setHoldReason,
    closeHoldReasonDialog,
    updateTaskStatusMutation,
    handleStatusChange,
    handleHoldReasonSubmit,
    handleInlineEdit,
    handleSelectTask,
    closeTaskPanel,
    handleUrgencyChange,
    handleAssigneeChange,
    handlePropertyChange,
    handleDepartmentChange,
    handleProjectStatusChange,
    departmentFilter,
    setDepartmentFilterAndUrl,
    areas,
    UNASSIGNED_DEPARTMENT_ID,
    getPropertyName,
    getDepartmentName,
    getPropertyById,
    subTasksMap,
    standaloneTasks,
    projectTasksMap,
    allProjectTasksMap,
    filteredStandaloneTasks,
    filteredProjects,
    projectsTabFiltered,
    unifiedGroups,
    boardItemCount,
    userGroups,
  };
}

export type WorkContext = ReturnType<typeof useWorkAdmin>;
