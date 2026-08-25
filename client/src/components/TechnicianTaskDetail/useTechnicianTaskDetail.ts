import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TechnicianTaskDetailProps } from "./types";

export function useTechnicianTaskDetail(props: TechnicianTaskDetailProps) {
  const {
    task, property, multiProperties = [], space, equipment, vehicle, contactStaff,
    notes, uploads, parts, quotes, activeTimer, timeEntries,
    allTaskResources, startTimerMutation, stopTimerMutation,
    addUploadMutation, estimateBlocksCompletion,
  } = props;

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"task" | "more">("task");
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pauseDialogMode, setPauseDialogMode] = useState<"running" | "paused">("running");
  const [isStartReminderOpen, setIsStartReminderOpen] = useState(false);
  const [isEstimateSheetOpen, setIsEstimateSheetOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isPreviousWorkOpen, setIsPreviousWorkOpen] = useState(false);

  const existingJobNote = notes.find((n) => n.noteType === "job_note");
  const [noteText, setNoteText] = useState(existingJobNote?.content || "");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(existingJobNote?.id || null);
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteInitializedRef = useRef(false);

  const taskStarted = task.status === "in_progress" || task.status === "completed" || task.status === "waiting_approval";
  const isRunning = !!activeTimer && !isPaused;

  useEffect(() => {
    setShowCompletion(false);
  }, [task.id]);

  useEffect(() => {
    if ((task.status === "in_progress" || task.status === "waiting_approval") && !activeTimer) {
      setIsPaused(true);
    } else if (activeTimer) {
      setIsPaused(false);
    }
  }, [task.status, activeTimer]);

  useEffect(() => {
    if (!activeTimer || isPaused) return;
    const entry = timeEntries.find((e) => e.id === activeTimer);
    if (!entry?.startTime) return;

    const startMs = new Date(entry.startTime).getTime();
    const previousCompleted = timeEntries
      .filter((e) => e.id !== activeTimer && e.startTime && e.endTime)
      .reduce((sum, e) => {
        const start = new Date(e.startTime!).getTime();
        const end = new Date(e.endTime!).getTime();
        return sum + Math.max(0, Math.floor((end - start) / 1000));
      }, 0);

    const update = () => {
      const now = Date.now();
      const currentSeg = Math.floor((now - startMs) / 1000);
      setElapsedSeconds(previousCompleted + Math.max(0, currentSeg));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTimer, isPaused, timeEntries]);

  useEffect(() => {
    if (isPaused || !activeTimer) {
      const total = timeEntries
        .filter((e) => e.startTime && e.endTime)
        .reduce((sum, e) => {
          const start = new Date(e.startTime!).getTime();
          const end = new Date(e.endTime!).getTime();
          return sum + Math.max(0, Math.floor((end - start) / 1000));
        }, 0);
      if (total > 0) setElapsedSeconds(total);
    }
  }, [isPaused, activeTimer, timeEntries]);

  useEffect(() => {
    noteInitializedRef.current = false;
  }, [task.id]);

  useEffect(() => {
    if (!noteInitializedRef.current) {
      if (existingJobNote) {
        setNoteText(existingJobNote.content || "");
        setCurrentNoteId(existingJobNote.id);
      } else {
        setNoteText("");
        setCurrentNoteId(null);
      }
      noteInitializedRef.current = true;
    }
  }, [existingJobNote, task.id]);

  const handleNoteChange = useCallback((value: string) => {
    setNoteText(value);
    if (!value.trim()) {
      setSaveIndicator("idle");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    setSaveIndicator("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    debounceRef.current = setTimeout(async () => {
      try {
        if (currentNoteId) {
          await apiRequest("PATCH", `/api/task-notes/${currentNoteId}`, { content: trimmed });
        } else {
          const response = await apiRequest("POST", "/api/task-notes", {
            taskId: task.id,
            content: trimmed,
            noteType: "job_note",
          });
          const created = await response.json();
          if (created?.id) setCurrentNoteId(created.id);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", task.id] });
        setSaveIndicator("saved");
        if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
        savedIndicatorRef.current = setTimeout(() => setSaveIndicator("idle"), 2000);
      } catch {
        setSaveIndicator("idle");
      }
    }, 1200);
  }, [currentNoteId, task.id]);

  const handleStartTask = () => {
    setIsStartReminderOpen(true);
  };

  const handleStartReminderConfirm = () => {
    startTimerMutation.mutate(undefined, {
      onSuccess: () => setIsStartReminderOpen(false),
    });
  };

  const handlePauseTap = () => {
    setPauseDialogMode("running");
    setIsPauseDialogOpen(true);
  };

  const handleFinishTap = () => {
    setPauseDialogMode("paused");
    setIsPauseDialogOpen(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    startTimerMutation.mutate();
  };

  const handlePauseConfirm = async () => {
    if (!activeTimer) {
      setIsPauseDialogOpen(false);
      return;
    }
    try {
      await stopTimerMutation.mutateAsync({ timerId: activeTimer });
      setIsPaused(true);
      setIsPauseDialogOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to pause timer";
      toast({ title: "Failed to pause", description: message, variant: "destructive" });
    }
  };

  const handlePauseAndLeave = async () => {
    if (activeTimer) {
      try {
        await stopTimerMutation.mutateAsync({ timerId: activeTimer });
        setIsPaused(true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to pause timer";
        toast({ title: "Failed to pause", description: message, variant: "destructive" });
        return;
      }
    }
    // Pause clears the active timer; navigate using the pending leave target.
    props.confirmLeave();
  };

  const handleMarkComplete = async () => {
    if (estimateBlocksCompletion) {
      toast({ title: "Cannot complete", description: "Estimates must be approved first.", variant: "destructive" });
      return;
    }
    if (task.requiresPhoto && uploads.length === 0) {
      toast({ title: "Photo required", description: "Please take a photo before completing.", variant: "destructive" });
      return;
    }
    try {
      await stopTimerMutation.mutateAsync({
        timerId: activeTimer ?? undefined,
        newStatus: "completed",
      });
      setIsPauseDialogOpen(false);
      setShowCompletion(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Failed to complete task",
        description: message,
        variant: "destructive",
      });
    }
  };

  const [locationExpanded, setLocationExpanded] = useState(false);
  const locationText = (() => {
    if (task.isCampusWide) return "All Campus Buildings";
    if (multiProperties.length > 0) {
      if (locationExpanded) {
        return multiProperties.map((p) => p.name).join(", ");
      }
      const maxShow = 2;
      const names = multiProperties.slice(0, maxShow).map((p) => p.name);
      const rest = multiProperties.length - maxShow;
      return rest > 0 ? `${names.join(", ")}` : names.join(", ");
    }
    return [property?.name, space?.name, equipment?.name].filter(Boolean).join(" \u00B7 ");
  })();
  const hasMoreBuildings = !locationExpanded && multiProperties.length > 2;

  const vehicleText = (() => {
    if (vehicle) {
      const name = `${vehicle.make} ${vehicle.model}`.trim();
      return [name, vehicle.vehicleId].filter(Boolean).join(" · ");
    }
    return task.vehicleName?.trim() || "";
  })();

  const contactName = contactStaff
    ? `${contactStaff.firstName || ""} ${contactStaff.lastName || ""}`.trim() || contactStaff.username
    : task.contactName || "";
  const contactPhone = task.contactPhone || contactStaff?.phoneNumber || "";
  const contactInitials = contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const resourceDocs = allTaskResources.filter((r: any) => r.type !== "video").length;
  const resourceVids = allTaskResources.filter((r: any) => r.type === "video").length;

  const existingQuote = quotes.length > 0 ? quotes[0] : null;

  const isCompleted = showCompletion || task.status === "completed";

  return {
    navigate,
    toast,
    activeTab, setActiveTab,
    isPaused, setIsPaused,
    elapsedSeconds,
    showCompletion,
    isPauseDialogOpen, setIsPauseDialogOpen,
    pauseDialogMode,
    isStartReminderOpen, setIsStartReminderOpen,
    isEstimateSheetOpen, setIsEstimateSheetOpen,
    isPartModalOpen, setIsPartModalOpen,
    isResourcesOpen, setIsResourcesOpen,
    isPreviousWorkOpen, setIsPreviousWorkOpen,
    noteText, setNoteText,
    currentNoteId,
    saveIndicator,
    taskStarted,
    isRunning,
    handleNoteChange,
    handleStartTask,
    handleStartReminderConfirm,
    handlePauseTap,
    handleFinishTap,
    handleResume,
    handlePauseConfirm,
    handlePauseAndLeave,
    handleMarkComplete,
    locationExpanded, setLocationExpanded,
    locationText,
    vehicleText,
    hasMoreBuildings,
    contactName,
    contactPhone,
    contactInitials,
    resourceDocs,
    resourceVids,
    existingQuote,
    isCompleted,
  };
}

export type TechnicianTaskDetailHookReturn = ReturnType<typeof useTechnicianTaskDetail>;
