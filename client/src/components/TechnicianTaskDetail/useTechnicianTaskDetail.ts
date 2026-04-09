import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Upload } from "@shared/schema";

import type { TechnicianTaskDetailProps } from "./types";

export function useTechnicianTaskDetail(props: TechnicianTaskDetailProps) {
  const {
    task, property, multiProperties = [], space, equipment, contactStaff,
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
  const [isEstimateSheetOpen, setIsEstimateSheetOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<Upload | null>(null);
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
      .filter((e) => e.id !== activeTimer && e.durationMinutes)
      .reduce((sum, e) => sum + (e.durationMinutes || 0) * 60, 0);

    const update = () => {
      const now = Date.now();
      const currentSeg = Math.floor((now - startMs) / 1000);
      setElapsedSeconds(previousCompleted + currentSeg);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTimer, isPaused, timeEntries]);

  useEffect(() => {
    if (isPaused || !activeTimer) {
      const total = timeEntries
        .filter((e) => e.durationMinutes)
        .reduce((sum, e) => sum + (e.durationMinutes || 0) * 60, 0);
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
    startTimerMutation.mutate();
  };

  const handlePauseTap = () => {
    setIsPauseDialogOpen(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    startTimerMutation.mutate();
  };

  const handlePauseConfirm = () => {
    if (activeTimer) {
      stopTimerMutation.mutate({ timerId: activeTimer });
      setIsPaused(true);
    }
    setIsPauseDialogOpen(false);
  };

  const handleMarkComplete = () => {
    if (estimateBlocksCompletion) {
      toast({ title: "Cannot complete", description: "Estimates must be approved first.", variant: "destructive" });
      return;
    }
    if (task.requiresPhoto && uploads.length === 0) {
      toast({ title: "Photo required", description: "Please take a photo before completing.", variant: "destructive" });
      return;
    }
    setIsPauseDialogOpen(false);
    const onCompleteSuccess = () => setShowCompletion(true);
    const onCompleteError = () => toast({ title: "Failed to complete task", variant: "destructive" });
    if (activeTimer) {
      stopTimerMutation.mutate(
        { timerId: activeTimer, newStatus: "completed" },
        { onSuccess: onCompleteSuccess, onError: onCompleteError }
      );
    } else {
      props.updateStatusMutation.mutate("completed", {
        onSuccess: onCompleteSuccess,
        onError: onCompleteError,
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
    isEstimateSheetOpen, setIsEstimateSheetOpen,
    isPartModalOpen, setIsPartModalOpen,
    previewUpload, setPreviewUpload,
    isResourcesOpen, setIsResourcesOpen,
    isPreviousWorkOpen, setIsPreviousWorkOpen,
    noteText, setNoteText,
    currentNoteId,
    saveIndicator,
    taskStarted,
    isRunning,
    handleNoteChange,
    handleStartTask,
    handlePauseTap,
    handleResume,
    handlePauseConfirm,
    handleMarkComplete,
    locationExpanded, setLocationExpanded,
    locationText,
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
