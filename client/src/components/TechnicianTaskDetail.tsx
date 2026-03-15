import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Clock,
  ChevronLeft,
  MapPin,
  Phone,
  Camera,
  Check,
  Play,
  Pause,
  Lock,
  QrCode,
  CircleDollarSign,
  Package,
  History,
  FileText,
  Video,
  Star,
  X,
  ChevronRight,
  Search,
  ScanLine,
  Plus,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
import ResourceCard from "@/components/ResourceCard";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type {
  Task,
  TimeEntry,
  PartUsed,
  TaskNote,
  InventoryItem,
  User as UserType,
  Upload,
  Property,
  Equipment,
  Space,
  TaskChecklistGroup,
  TaskChecklistItem,
  Quote,
  Vendor,
  Vehicle,
} from "@shared/schema";

type ChecklistGroupWithItems = TaskChecklistGroup & { items: TaskChecklistItem[] };

interface TechnicianTaskDetailProps {
  task: Task;
  user: UserType;
  property?: Property;
  space?: Space;
  equipment?: Equipment;
  vehicle?: Vehicle;
  contactStaff?: UserType;
  notes: TaskNote[];
  uploads: Upload[];
  parts: PartUsed[];
  quotes: Quote[];
  vendors: Vendor[];
  inventoryItems: InventoryItem[];
  checklistGroups: ChecklistGroupWithItems[];
  subTasks: Task[];
  parentTask?: Task;
  timeEntries: TimeEntry[];
  activeTimer: string | null;
  allTaskResources: any[];
  previousWork: Task[];
  users: UserType[];
  isParentTask: boolean;
  isSubTask: boolean;
  completedSubTasks: number;
  subTaskProgress: number;
  totalChecklistItems: number;
  completedChecklistItems: number;
  estimateBlocksCompletion: boolean;
  startTimerMutation: any;
  stopTimerMutation: any;
  updateStatusMutation: any;
  addNoteMutation: any;
  addUploadMutation: any;
  addPartMutation: any;
  toggleChecklistItemMutation: any;
  createQuoteMutation: any;
  deleteQuoteMutation: any;
  safeNavigate: (path: string) => void;
  handleStartOrPause: () => void;
  handleComplete: () => void;
  getUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  handleAutoSaveUpload: (result: any) => void;
  handleEquipmentScan: (value: string) => void;
  handleScanPart: (value: string) => void;
  handleAiSuggestParts: () => void;
  isScanEquipmentOpen: boolean;
  setIsScanEquipmentOpen: (v: boolean) => void;
  isScanPartOpen: boolean;
  setIsScanPartOpen: (v: boolean) => void;
  isEquipmentLoading: boolean;
  isResourcesSheetOpen: boolean;
  setIsResourcesSheetOpen: (v: boolean) => void;
  isAddPartDialogOpen: boolean;
  setIsAddPartDialogOpen: (v: boolean) => void;
  isAddQuoteDialogOpen: boolean;
  setIsAddQuoteDialogOpen: (v: boolean) => void;
  isStopTimerDialogOpen: boolean;
  setIsStopTimerDialogOpen: (v: boolean) => void;
  selectedInventoryItemId: string;
  setSelectedInventoryItemId: (v: string) => void;
  inventorySearchQuery: string;
  setInventorySearchQuery: (v: string) => void;
  partQuantity: string;
  setPartQuantity: (v: string) => void;
  partNotes: string;
  setPartNotes: (v: string) => void;
  newQuoteEstimatedCost: string;
  setNewQuoteEstimatedCost: (v: string) => void;
  newQuoteVendorId: string;
  setNewQuoteVendorId: (v: string) => void;
  newQuoteVendorName: string;
  setNewQuoteVendorName: (v: string) => void;
  newQuoteNotes: string;
  setNewQuoteNotes: (v: string) => void;
  pendingQuoteFiles: any[];
  setPendingQuoteFiles: (v: any[]) => void;
  aiSuggestedParts: any[];
  isAiSuggestLoading: boolean;
  scannedEquipment: Equipment | null;
  scannedEquipmentTasks: Task[];
  scannedEquipmentResources: any[];
  isEquipmentInfoOpen: boolean;
  setIsEquipmentInfoOpen: (v: boolean) => void;
  equipmentInfoTab: "info" | "history" | "resources";
  setEquipmentInfoTab: (v: "info" | "history" | "resources") => void;
}

const PASTEL_COLORS = ["#BFDBFE", "#BBF7D0", "#FED7AA", "#FECDD3", "#DDD6FE"];

function getGradient(status: string, isPaused: boolean): string {
  if (isPaused) return "linear-gradient(135deg, #374151 0%, #4B5563 100%)";
  if (status === "in_progress") return "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 55%, #3b82f6 100%)";
  return "linear-gradient(135deg, #3730A3 0%, #4338CA 60%, #6366F1 100%)";
}

function getStatusLabel(status: string, isPaused: boolean): string {
  if (isPaused) return "Paused";
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Not Started";
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TechnicianTaskDetail(props: TechnicianTaskDetailProps) {
  const {
    task, user, property, space, equipment, vehicle, contactStaff,
    notes, uploads, parts, quotes, vendors, inventoryItems,
    checklistGroups, subTasks, parentTask, timeEntries, activeTimer,
    allTaskResources, previousWork, users,
    isParentTask, isSubTask, completedSubTasks, subTaskProgress,
    totalChecklistItems, completedChecklistItems, estimateBlocksCompletion,
    startTimerMutation, stopTimerMutation, addNoteMutation, addUploadMutation,
    addPartMutation, toggleChecklistItemMutation, createQuoteMutation, deleteQuoteMutation,
    safeNavigate, getUploadParameters, handleAutoSaveUpload,
    handleEquipmentScan, handleScanPart,
    isScanEquipmentOpen, setIsScanEquipmentOpen,
    isScanPartOpen, setIsScanPartOpen,
    isEquipmentLoading,
    selectedInventoryItemId, setSelectedInventoryItemId,
    inventorySearchQuery, setInventorySearchQuery,
    partQuantity, setPartQuantity, partNotes, setPartNotes,
    newQuoteEstimatedCost, setNewQuoteEstimatedCost,
    newQuoteVendorId, setNewQuoteVendorId,
    newQuoteVendorName, setNewQuoteVendorName,
    newQuoteNotes, setNewQuoteNotes,
    pendingQuoteFiles,
  } = props;

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"task" | "more">("task");
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionTime, setCompletionTime] = useState(0);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isEstimateSheetOpen, setIsEstimateSheetOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isPreviousWorkOpen, setIsPreviousWorkOpen] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const taskStarted = task.status === "in_progress" || task.status === "completed";
  const isRunning = !!activeTimer && !isPaused;

  useEffect(() => {
    if (task.status === "in_progress" && !activeTimer) {
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

  const pendingSaveRef = useRef<string>("");

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
    pendingSaveRef.current = trimmed;
    debounceRef.current = setTimeout(async () => {
      try {
        await addNoteMutation.mutateAsync({ content: trimmed, noteType: "job_note" });
        setNoteText((current) => {
          if (current.trim() === trimmed || current.trim() === "") return "";
          return current;
        });
        setSaveIndicator("saved");
        if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
        savedIndicatorRef.current = setTimeout(() => setSaveIndicator("idle"), 2000);
      } catch {
        setSaveIndicator("idle");
      }
    }, 1200);
  }, [addNoteMutation]);

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
    setCompletionTime(elapsedSeconds);
    setIsPauseDialogOpen(false);
    if (activeTimer) {
      stopTimerMutation.mutate(
        { timerId: activeTimer, newStatus: "completed" },
        {
          onSuccess: () => setShowCompletion(true),
          onError: () => toast({ title: "Failed to complete task", variant: "destructive" }),
        }
      );
    } else {
      props.updateStatusMutation.mutate("completed", {
        onSuccess: () => setShowCompletion(true),
        onError: () => toast({ title: "Failed to complete task", variant: "destructive" }),
      });
    }
  };

  const locationText = [
    property?.name,
    space?.name,
    equipment?.name,
  ].filter(Boolean).join(" \u00B7 ");

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

  if (isCompleted) {
    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const displaySecs = showCompletion ? completionTime : totalMinutes * 60;
    const mins = Math.floor(displaySecs / 60);
    const secs = displaySecs % 60;
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ backgroundColor: "#F0FDF4" }}
        data-testid="completion-overlay"
      >
        <div
          className="flex items-center justify-center rounded-full mb-6"
          style={{ width: 62, height: 62, backgroundColor: "#15803D" }}
        >
          <Check className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-bold mb-1" style={{ color: "#15803D" }}>
          Task Complete
        </p>
        <p className="text-sm mb-2" style={{ color: "#166534" }}>
          {task.name}
        </p>
        <p className="text-sm mb-8" style={{ color: "#4ADE80" }}>
          Time logged: {mins}m {secs}s
        </p>
        <button
          className="px-8 py-3 rounded-lg text-white font-medium text-sm"
          style={{ backgroundColor: "#15803D" }}
          onClick={() => navigate("/work")}
          data-testid="button-back-to-tasks"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] md:min-h-full" style={{ backgroundColor: "#F8F8F8" }}>
      {/* Top Navigation Bar — back button only, Sign Out is in the global header */}
      {isSubTask && parentTask && (
        <div
          className="flex items-center px-4 shrink-0"
          style={{
            height: 44,
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #EEEEEE",
          }}
          data-testid="tech-top-nav"
        >
          <button
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: "#4338CA" }}
            onClick={() => safeNavigate(`/tasks/${task.parentTaskId}`)}
            data-testid="link-back-to-parent"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{parentTask.name}</span>
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div
        className="px-4 pt-4 pb-5 shrink-0"
        style={{
          background: getGradient(task.status, isPaused),
          transition: "background 0.4s",
        }}
        data-testid="tech-hero"
      >
        <div className="flex items-center justify-between flex-wrap gap-1 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              data-testid="badge-status"
            >
              {getStatusLabel(task.status, isPaused)}
            </span>
            {task.urgency === "high" && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#FEF2F2",
                  color: "#D94F4F",
                  border: "1px solid rgba(217,79,79,0.35)",
                }}
                data-testid="badge-priority"
              >
                High
              </span>
            )}
            {task.urgency === "medium" && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#FEF9EC",
                  color: "#D97706",
                  border: "1px solid rgba(217,119,6,0.35)",
                }}
                data-testid="badge-priority"
              >
                Medium
              </span>
            )}
          </div>
          {taskStarted && (
            <span
              className="text-sm font-medium"
              style={{
                color: "rgba(255,255,255,0.85)",
                fontVariantNumeric: "tabular-nums",
              }}
              data-testid="text-elapsed-timer"
            >
              {formatElapsed(elapsedSeconds)}
            </span>
          )}
        </div>
        <h1
          className="text-lg font-bold text-white leading-snug mb-1.5"
          data-testid="text-task-name"
        >
          {task.name}
        </h1>
        {locationText && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.7)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {locationText}
            </span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.7)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              Due {format(new Date(task.dueDate), "MMM d, yyyy")}
            </span>
          </div>
        )}
      </div>

      {/* Two-Tab Navigation */}
      <div
        className="flex shrink-0"
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EEEEEE",
        }}
        data-testid="tech-tabs"
      >
        {(["task", "more"] as const).map((tab) => (
          <button
            key={tab}
            className="flex-1 py-3 text-sm font-medium text-center"
            style={{
              color: activeTab === tab ? "#4338CA" : "#9CA3AF",
              borderBottom: activeTab === tab ? "2px solid #4338CA" : "2px solid transparent",
            }}
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            {tab === "task" ? "Task" : "More"}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="px-2.5 py-2 space-y-2">
          {activeTab === "task" ? (
            <>
              {/* Card 1 — Instructions */}
              {task.instructions && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                  }}
                  data-testid="card-instructions"
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2"
                    style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                  >
                    Instructions
                  </p>
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: "#EEF2FF",
                      border: "1px solid #C7D2FE",
                      borderRadius: 9,
                    }}
                  >
                    <p
                      className="text-xs whitespace-pre-wrap"
                      style={{ color: "#3730A3", lineHeight: 1.65 }}
                    >
                      {task.instructions}
                    </p>
                  </div>
                </div>
              )}

              {task.description && !task.instructions && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                  }}
                  data-testid="card-description"
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2"
                    style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                  >
                    Description
                  </p>
                  <p className="text-sm" style={{ color: "#1A1A1A", lineHeight: 1.65 }}>
                    {task.description}
                  </p>
                </div>
              )}

              {/* Card 2 — Subtasks */}
              {subTasks.length > 0 && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                  }}
                  data-testid="card-subtasks"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[10px] uppercase font-medium"
                      style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                    >
                      Subtasks
                    </p>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {completedSubTasks} / {subTasks.length}
                    </span>
                  </div>
                  <div
                    className="rounded-full mb-3 overflow-hidden"
                    style={{ height: 3, backgroundColor: "#EEEEEE" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${subTaskProgress}%`,
                        backgroundColor: "#4338CA",
                      }}
                    />
                  </div>
                  <div
                    className="space-y-1"
                    style={{
                      opacity: taskStarted ? 1 : 0.4,
                      pointerEvents: taskStarted ? "auto" : "none",
                    }}
                  >
                    {subTasks.map((st) => {
                      const isDone = st.status === "completed";
                      return (
                        <div
                          key={st.id}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                          onClick={() => taskStarted && safeNavigate(`/tasks/${st.id}`)}
                          data-testid={`subtask-row-${st.id}`}
                        >
                          <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              backgroundColor: isDone ? "#4338CA" : "transparent",
                              border: isDone ? "none" : "2px solid #D1D5DB",
                            }}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span
                            className="text-sm flex-1"
                            style={{
                              color: isDone ? "#9CA3AF" : "#1A1A1A",
                              textDecoration: isDone ? "line-through" : "none",
                              fontSize: 13,
                            }}
                          >
                            {st.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {!taskStarted && (
                    <div
                      className="flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg"
                      style={{
                        backgroundColor: "#F8F8F8",
                        borderTop: "1px solid #EEEEEE",
                      }}
                      data-testid="lock-banner-subtasks"
                    >
                      <Lock className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>
                        Start the task to unlock subtasks
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Card 3 — Checklist */}
              {checklistGroups.length > 0 && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                  }}
                  data-testid="card-checklist"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[10px] uppercase font-medium"
                      style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                    >
                      Checklist
                    </p>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {completedChecklistItems} / {totalChecklistItems}
                    </span>
                  </div>
                  <div
                    className="rounded-full mb-3 overflow-hidden"
                    style={{ height: 3, backgroundColor: "#EEEEEE" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: totalChecklistItems > 0
                          ? `${(completedChecklistItems / totalChecklistItems) * 100}%`
                          : "0%",
                        backgroundColor: "#4338CA",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    {checklistGroups.map((group) =>
                      group.items.map((item) => {
                        const isDone = item.isCompleted;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 py-2 cursor-pointer"
                            onClick={() =>
                              toggleChecklistItemMutation.mutate({
                                itemId: item.id,
                                isCompleted: !item.isCompleted,
                              })
                            }
                            data-testid={`checklist-item-${item.id}`}
                          >
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: isDone ? "#4338CA" : "transparent",
                                border: isDone ? "none" : "2px solid #D1D5DB",
                              }}
                            >
                              {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span
                              className="flex-1"
                              style={{
                                color: isDone ? "#9CA3AF" : "#1A1A1A",
                                textDecoration: isDone ? "line-through" : "none",
                                fontSize: 13,
                              }}
                            >
                              {item.text}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Card 4 — Notes + Photos */}
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #EEEEEE",
                }}
                data-testid="card-notes-photos"
              >
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-[10px] uppercase font-medium"
                    style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                  >
                    Notes
                  </p>
                  {saveIndicator === "saving" && (
                    <span className="text-[10px]" style={{ color: "#4338CA" }}>
                      Saving...
                    </span>
                  )}
                  {saveIndicator === "saved" && (
                    <span className="text-[10px]" style={{ color: "#15803D" }}>
                      Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Type your observations... auto-saved as you type"
                  rows={3}
                  className="w-full resize-none bg-transparent outline-none"
                  style={{
                    border: "none",
                    fontSize: 13,
                    color: "#1A1A1A",
                    lineHeight: 1.5,
                    minHeight: 72,
                  }}
                  data-testid="textarea-auto-note"
                />
                {notes.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {[...notes]
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .map((note) => (
                        <div
                          key={note.id}
                          className="px-2.5 py-2 rounded-lg"
                          style={{
                            backgroundColor: "#F8F8F8",
                            borderRadius: 8,
                          }}
                          data-testid={`saved-note-${note.id}`}
                        >
                          <p className="text-xs" style={{ color: "#1A1A1A" }}>
                            {note.content}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>
                            {note.createdAt && format(new Date(note.createdAt), "h:mm a")}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {uploads.length > 0 && (
                  <div className="mt-3">
                    <p
                      className="text-[10px] uppercase font-medium mb-2"
                      style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                    >
                      Photos
                    </p>
                    <div className="flex flex-wrap gap-[5px]">
                      {uploads.map((upload, i) => (
                        <div
                          key={upload.id}
                          className="flex items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            backgroundColor: PASTEL_COLORS[i % PASTEL_COLORS.length],
                          }}
                          data-testid={`photo-thumb-${upload.id}`}
                        >
                          <Camera className="w-3.5 h-3.5 text-white" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* More Tab — Contact Card */}
              {(contactName || contactPhone) && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                  }}
                  data-testid="card-contact"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center shrink-0 text-white text-xs font-medium rounded-full"
                      style={{
                        width: 34,
                        height: 34,
                        backgroundColor: "#3DAB8E",
                      }}
                    >
                      {contactInitials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
                        {contactName}
                      </p>
                      {contactPhone && (
                        <p className="text-[11px]" style={{ color: "#6B7280" }}>
                          Tap to call &middot; {contactPhone}
                        </p>
                      )}
                    </div>
                    {contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="flex items-center justify-center shrink-0 rounded-full"
                        style={{
                          width: 30,
                          height: 30,
                          backgroundColor: "#EEF2FF",
                        }}
                        data-testid="button-call-contact"
                      >
                        <Phone className="w-3.5 h-3.5" style={{ color: "#4338CA" }} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* More Tab — Actions Card */}
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #EEEEEE",
                }}
                data-testid="card-actions"
              >
                {/* Estimate / Quote */}
                {task.requiresEstimate && (
                  <button
                    className="flex items-center gap-3 w-full py-3 text-left"
                    style={{ borderBottom: "1px solid #EEEEEE" }}
                    onClick={() => setIsEstimateSheetOpen(true)}
                    data-testid="action-estimate"
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#FEF9EC",
                      }}
                    >
                      <CircleDollarSign className="w-4 h-4" style={{ color: "#D97706" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                        Estimate / Quote
                      </p>
                      {existingQuote && (
                        <p className="text-[11px]" style={{ color: "#6B7280" }}>
                          {task.estimateStatus === "waiting_approval"
                            ? `Pending approval \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                            : task.estimateStatus === "approved"
                              ? `Approved \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                              : `$${(existingQuote.estimatedCost || 0).toFixed(2)}`}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  </button>
                )}

                {/* Parts Used */}
                <button
                  className="flex items-center gap-3 w-full py-3 text-left"
                  style={{ borderBottom: "1px solid #EEEEEE" }}
                  onClick={() => setIsPartModalOpen(true)}
                  data-testid="action-parts"
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "#EEEDFE",
                    }}
                  >
                    <Star className="w-4 h-4" style={{ color: "#4338CA" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                      Parts Used
                    </p>
                  </div>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: parts.length > 0 ? "#4338CA" : "#9CA3AF" }}
                  >
                    {parts.length > 0 ? `${parts.length} added` : "None"}
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                </button>

                {/* Previous Work */}
                {previousWork.length > 0 && (
                  <button
                    className="flex items-center gap-3 w-full py-3 text-left"
                    style={{ borderBottom: "1px solid #EEEEEE" }}
                    onClick={() => setIsPreviousWorkOpen(true)}
                    data-testid="action-previous-work"
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#F0FDF4",
                      }}
                    >
                      <History className="w-4 h-4" style={{ color: "#15803D" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                        Previous Work
                      </p>
                    </div>
                    <span
                      className="flex items-center justify-center text-xs font-medium shrink-0 px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "#EEF2FF",
                        color: "#4338CA",
                      }}
                    >
                      {previousWork.length}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  </button>
                )}

                {/* Resources */}
                {allTaskResources.length > 0 && (
                  <button
                    className="flex items-center gap-3 w-full py-3 text-left"
                    onClick={() => setIsResourcesOpen(true)}
                    data-testid="action-resources"
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#F8F8F8",
                      }}
                    >
                      <FileText className="w-4 h-4" style={{ color: "#6B7280" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                        Resources
                      </p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: "#9CA3AF" }}>
                      {resourceDocs > 0 && `${resourceDocs} doc${resourceDocs !== 1 ? "s" : ""}`}
                      {resourceDocs > 0 && resourceVids > 0 && " \u00B7 "}
                      {resourceVids > 0 && `${resourceVids} vid`}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#9CA3AF" }} />
                  </button>
                )}
              </div>

              {/* Show existing parts if any */}
              {parts.length > 0 && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                  }}
                  data-testid="card-parts-list"
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2"
                    style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
                  >
                    Parts Added
                  </p>
                  <div className="space-y-2">
                    {parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between py-1.5"
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                            {part.partName}
                          </p>
                          {part.notes && (
                            <p className="text-[11px]" style={{ color: "#6B7280" }}>
                              {part.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm" style={{ color: "#1A1A1A" }}>
                            Qty: {part.quantity}
                          </p>
                          <p className="text-[11px]" style={{ color: "#6B7280" }}>
                            ${Number(part.cost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div
        className="sticky bottom-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid #EEEEEE",
          padding: "8px 14px 16px",
        }}
        data-testid="tech-bottom-bar"
      >
        <div className="flex items-center gap-3">
          {/* Scan Button */}
          <button
            className="flex items-center justify-center shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: "1px solid #EEEEEE",
            }}
            onClick={() => setIsScanEquipmentOpen(true)}
            disabled={isEquipmentLoading}
            data-testid="bottom-button-scan"
          >
            <QrCode className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>

          {/* Primary CTA */}
          {task.status === "completed" ? (
            <div
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: "#15803D" }}
            >
              <Check className="w-4 h-4" />
              Completed
            </div>
          ) : !taskStarted ? (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm"
              style={{
                backgroundColor: "#4338CA",
                transition: "background 0.2s",
              }}
              onClick={handleStartTask}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-start"
            >
              <Play className="w-4 h-4" />
              Start Task
            </button>
          ) : isPaused ? (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm"
              style={{
                backgroundColor: "#4338CA",
                transition: "background 0.2s",
              }}
              onClick={handleResume}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-resume"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          ) : (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm"
              style={{
                backgroundColor: "#4B5563",
                transition: "background 0.2s",
              }}
              onClick={handlePauseTap}
              disabled={stopTimerMutation.isPending}
              data-testid="bottom-button-pause"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}

          {/* Camera Button */}
          <div
            style={{
              opacity: taskStarted ? 1 : 0.35,
              pointerEvents: taskStarted ? "auto" : "none",
            }}
          >
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10485760}
              onGetUploadParameters={getUploadParameters}
              onComplete={handleAutoSaveUpload}
              onError={(error) => {
                toast({
                  title: "Upload failed",
                  description: error.message,
                  variant: "destructive",
                });
              }}
              buttonVariant="outline"
              buttonClassName="flex items-center justify-center"
              buttonTestId="bottom-button-camera"
              isLoading={addUploadMutation.isPending}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: taskStarted ? "1px solid #4338CA" : "1px solid #EEEEEE",
                  backgroundColor: taskStarted ? "#EEF2FF" : "transparent",
                }}
              >
                <Camera
                  className="w-5 h-5"
                  style={{ color: taskStarted ? "#4338CA" : "#6B7280" }}
                />
              </div>
            </ObjectUploader>
          </div>
        </div>
      </div>

      {/* Pause / Complete Dialog */}
      {isPauseDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPauseDialogOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full sm:max-w-lg"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px 26px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-pause-complete"
          >
            <p className="text-sm font-semibold mb-1" style={{ color: "#1A1A1A" }}>
              Timer running
            </p>
            <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
              What would you like to do?
            </p>
            <div className="space-y-2">
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: "#4B5563" }}
                onClick={handlePauseConfirm}
                disabled={stopTimerMutation.isPending}
                data-testid="button-pause-confirm"
              >
                <Pause className="w-4 h-4" />
                Pause — resume later
              </button>
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: "#15803D" }}
                onClick={handleMarkComplete}
                disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
                data-testid="button-mark-complete"
              >
                <Check className="w-4 h-4" />
                Mark as complete
              </button>
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center"
                style={{
                  backgroundColor: "#F8F8F8",
                  border: "1px solid #EEEEEE",
                  color: "#6B7280",
                }}
                onClick={() => setIsPauseDialogOpen(false)}
                data-testid="button-pause-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estimate / Quote Sheet */}
      {isEstimateSheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsEstimateSheetOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px 26px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                Estimates
              </p>
              <button onClick={() => setIsEstimateSheetOpen(false)}>
                <X className="w-5 h-5" style={{ color: "#9CA3AF" }} />
              </button>
            </div>
            {quotes.length > 0 && (
              <div className="space-y-2 mb-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: "#FEF9EC",
                      border: "1px solid #FDE68A",
                    }}
                    data-testid={`estimate-row-${quote.id}`}
                  >
                    {quote.vendorName && (
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {quote.vendorName}
                      </p>
                    )}
                    <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                      ${(quote.estimatedCost || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[11px]" style={{ color: "#D97706" }}>
                      {quote.status === "approved" ? "Approved" : "Pending approval"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {task.estimateStatus !== "approved" && (
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  border: "2px dashed #D97706",
                  color: "#D97706",
                  backgroundColor: "transparent",
                }}
                onClick={() => {
                  setIsEstimateSheetOpen(false);
                  props.setIsAddQuoteDialogOpen(true);
                }}
                data-testid="button-add-another-quote"
              >
                <Plus className="w-4 h-4" />
                Add another quote
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {isPartModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPartModalOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px 26px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-part"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                Add Part
              </p>
              <button onClick={() => setIsPartModalOpen(false)}>
                <X className="w-5 h-5" style={{ color: "#9CA3AF" }} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#9CA3AF" }}
                  />
                  <Input
                    placeholder="Search inventory..."
                    value={inventorySearchQuery}
                    onChange={(e) => {
                      setInventorySearchQuery(e.target.value);
                      setSelectedInventoryItemId("");
                    }}
                    className="pl-9"
                    data-testid="input-search-part"
                  />
                </div>
                <button
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: "1px solid #EEEEEE",
                  }}
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setIsScanPartOpen(true);
                  }}
                  data-testid="button-scan-part-qr"
                >
                  <QrCode className="w-4 h-4" style={{ color: "#6B7280" }} />
                </button>
              </div>

              {inventorySearchQuery && !selectedInventoryItemId && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {inventoryItems
                    ?.filter((item) =>
                      item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 cursor-pointer text-sm"
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                        onClick={() => {
                          setSelectedInventoryItemId(item.id);
                          setInventorySearchQuery(item.name);
                        }}
                      >
                        {item.name}
                      </div>
                    ))}
                </div>
              )}

              {selectedInventoryItemId && (
                <div
                  className="p-2 rounded-md text-sm font-medium"
                  style={{ backgroundColor: "#F3F4F6" }}
                >
                  {inventoryItems.find((i) => i.id === selectedInventoryItemId)?.name}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
                    QTY
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(e.target.value)}
                    placeholder="1"
                    data-testid="input-part-qty"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
                    COST
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      selectedInventoryItemId
                        ? (
                            (parseFloat(
                              inventoryItems.find((i) => i.id === selectedInventoryItemId)
                                ?.cost || "0"
                            ) || 0) * (parseFloat(partQuantity) || 1)
                          ).toFixed(2)
                        : ""
                    }
                    readOnly
                    placeholder="0.00"
                    data-testid="input-part-cost"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: "#4338CA" }}
                  onClick={() => {
                    addPartMutation.mutate();
                    setIsPartModalOpen(false);
                  }}
                  disabled={
                    !selectedInventoryItemId ||
                    !partQuantity ||
                    addPartMutation.isPending
                  }
                  data-testid="button-confirm-add-part"
                >
                  Add Part
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: "#F8F8F8",
                    border: "1px solid #EEEEEE",
                    color: "#6B7280",
                  }}
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setSelectedInventoryItemId("");
                    setInventorySearchQuery("");
                    setPartQuantity("");
                    setPartNotes("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resources Sheet */}
      {isResourcesOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsResourcesOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full sm:max-w-lg max-h-[70vh] overflow-y-auto"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px 26px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-resources"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                Resources
              </p>
              <button onClick={() => setIsResourcesOpen(false)}>
                <X className="w-5 h-5" style={{ color: "#9CA3AF" }} />
              </button>
            </div>
            <div className="space-y-1">
              {[...allTaskResources]
                .sort((a, b) => a.title?.localeCompare(b.title || "") || 0)
                .map((resource: any) => {
                  const isVideo = resource.type === "video";
                  return (
                    <button
                      key={resource.id}
                      className="flex items-center gap-3 w-full py-3 text-left"
                      style={{ borderBottom: "1px solid #EEEEEE" }}
                      onClick={() => window.open(toDisplayUrl(resource.url), "_blank")}
                      data-testid={`resource-row-${resource.id}`}
                    >
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0"
                        style={{
                          backgroundColor: isVideo ? "#FEE2E2" : "#EDE9FE",
                          color: isVideo ? "#DC2626" : "#7C3AED",
                        }}
                      >
                        {isVideo ? "VID" : "PDF"}
                      </span>
                      <span className="text-sm flex-1 truncate" style={{ color: "#1A1A1A" }}>
                        {resource.title}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Add Estimate Dialog */}
      {props.isAddQuoteDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => props.setIsAddQuoteDialogOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px 26px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                Add Estimate
              </p>
              <button onClick={() => props.setIsAddQuoteDialogOpen(false)}>
                <X className="w-5 h-5" style={{ color: "#9CA3AF" }} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  Estimated Cost
                </Label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#9CA3AF" }}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newQuoteEstimatedCost}
                    onChange={(e) => setNewQuoteEstimatedCost(e.target.value)}
                    className="pl-8"
                    data-testid="input-quote-cost"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  Vendor (Optional)
                </Label>
                <Select
                  value={newQuoteVendorId}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setNewQuoteVendorId("");
                      setNewQuoteVendorName("");
                    } else {
                      setNewQuoteVendorId(value);
                      const v = vendors.find((v) => v.id === value);
                      setNewQuoteVendorName(v?.name || "");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-quote-vendor">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  Notes (Optional)
                </Label>
                <Textarea
                  placeholder="Details..."
                  value={newQuoteNotes}
                  onChange={(e) => setNewQuoteNotes(e.target.value)}
                  data-testid="input-quote-notes"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: "#4338CA" }}
                  onClick={() =>
                    createQuoteMutation.mutate({
                      vendorName: newQuoteVendorName,
                      estimatedCost: parseFloat(newQuoteEstimatedCost) || 0,
                      notes: newQuoteNotes,
                      files: pendingQuoteFiles,
                    })
                  }
                  disabled={!newQuoteEstimatedCost || createQuoteMutation.isPending}
                  data-testid="button-submit-quote"
                >
                  Add Estimate
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: "#F8F8F8",
                    border: "1px solid #EEEEEE",
                    color: "#6B7280",
                  }}
                  onClick={() => props.setIsAddQuoteDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previous Work Sheet */}
      {isPreviousWorkOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPreviousWorkOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px 26px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-previous-work"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                Previous Work
              </p>
              <button onClick={() => setIsPreviousWorkOpen(false)}>
                <X className="w-5 h-5" style={{ color: "#9CA3AF" }} />
              </button>
            </div>
            <div className="space-y-2">
              {previousWork.map((prevTask) => {
                const completedBy = users.find(u => u.id === prevTask.assignedToId);
                return (
                  <button
                    key={prevTask.id}
                    className="w-full text-left p-3 rounded-lg"
                    style={{ backgroundColor: "#F8F8F8", border: "1px solid #EEEEEE" }}
                    onClick={() => {
                      setIsPreviousWorkOpen(false);
                      safeNavigate(`/tasks/${prevTask.id}`);
                    }}
                    data-testid={`previous-work-item-${prevTask.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#1A1A1A" }}>
                          {prevTask.name}
                        </p>
                        {prevTask.description && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#6B7280" }}>
                            {prevTask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {completedBy && (
                            <span className="text-xs flex items-center gap-1" style={{ color: "#6B7280" }}>
                              {completedBy.firstName} {completedBy.lastName}
                            </span>
                          )}
                          {prevTask.updatedAt && (
                            <span className="text-xs" style={{ color: "#9CA3AF" }}>
                              {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#15803D" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanners */}
      <BarcodeScanner
        open={isScanEquipmentOpen}
        onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan an equipment QR code"
      />
      <BarcodeScanner
        open={isScanPartOpen}
        onOpenChange={(v) => {
          setIsScanPartOpen(v);
          if (!v) setIsPartModalOpen(true);
        }}
        onScan={(value) => {
          handleScanPart(value);
          setIsPartModalOpen(true);
        }}
        title="Scan Part"
        description="Scan a barcode to find this part"
      />
    </div>
  );
}
