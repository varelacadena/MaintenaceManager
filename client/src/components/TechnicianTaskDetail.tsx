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
  Info,
  ArrowLeft,
  Trash2,
  Wind,
  Zap,
  Droplets,
  Wrench,
  BookOpen,
  Sparkles,
  Building2,
  ExternalLink,
  Car,
  ImageIcon,
  LinkIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  updateNoteMutation?: any;
  addUploadMutation: any;
  deleteUploadMutation: any;
  addPartMutation: any;
  toggleChecklistItemMutation: any;
  createQuoteMutation: any;
  deleteQuoteMutation: any;
  updateSubtaskStatusMutation: any;
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
  scannedVehicle: Vehicle | null;
  isVehicleInfoOpen: boolean;
  setIsVehicleInfoOpen: (v: boolean) => void;
}

const PASTEL_COLORS = ["#BFDBFE", "#BBF7D0", "#FED7AA", "#FECDD3", "#DDD6FE"];

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

const EQUIPMENT_CATEGORY_ICONS: Record<string, any> = {
  hvac: Wind, electrical: Zap, plumbing: Droplets, mechanical: Wrench,
  appliances: Wrench, grounds: BookOpen, janitorial: Sparkles,
  structural: Building2, water_treatment: Droplets, general: Info,
};

const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  hvac: "HVAC", electrical: "Electrical", plumbing: "Plumbing",
  mechanical: "Mechanical", appliances: "Appliances", grounds: "Grounds",
  janitorial: "Janitorial", structural: "Structural", water_treatment: "Water Treatment", general: "General",
};

const RESOURCE_TYPE_ICONS: Record<string, any> = {
  video: Video, document: FileText, image: ImageIcon, link: LinkIcon,
};

const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  fair: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  poor: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "needs replacement": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

function getGradient(status: string, isPaused: boolean): string {
  if (isPaused) return "linear-gradient(135deg, #374151 0%, #4B5563 100%)";
  if (status === "in_progress") return "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 55%, #3b82f6 100%)";
  if (status === "waiting_approval") return "linear-gradient(135deg, #92400E 0%, #D97706 60%, #F59E0B 100%)";
  return "linear-gradient(135deg, #3730A3 0%, #4338CA 60%, #6366F1 100%)";
}

function getStatusLabel(status: string, isPaused: boolean): string {
  if (isPaused) return "Paused";
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "waiting_approval") return "Waiting Approval";
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
    startTimerMutation, stopTimerMutation, addNoteMutation, updateNoteMutation, addUploadMutation, deleteUploadMutation,
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
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-green-50 dark:bg-green-950"
        data-testid="completion-overlay"
      >
        <div
          className="flex items-center justify-center rounded-full mb-6 bg-green-700"
          style={{ width: 62, height: 62 }}
        >
          <Check className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-bold mb-1 text-green-700 dark:text-green-400">
          Task Complete
        </p>
        <p className="text-sm mb-2 text-green-800 dark:text-green-300">
          {task.name}
        </p>
        <p className="text-sm mb-8 text-green-400 dark:text-green-500">
          Time logged: {mins}m {secs}s
        </p>
        <button
          className="px-8 py-3 rounded-lg text-white font-medium text-sm bg-green-700 dark:bg-green-600"
          onClick={() => navigate("/work")}
          data-testid="button-back-to-tasks"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-muted/40 md:relative md:inset-auto md:z-auto md:min-h-full">
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
            <button
              className="flex items-center justify-center shrink-0 rounded-full"
              style={{
                width: 28,
                height: 28,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
              onClick={() => {
                if (isSubTask && task.parentTaskId) {
                  safeNavigate(`/tasks/${task.parentTaskId}`);
                } else {
                  safeNavigate("/work");
                }
              }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              data-testid="badge-status"
            >
              {getStatusLabel(task.status, isPaused)}
            </span>
            {task.urgency === "high" && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500 border border-red-500/35 dark:bg-red-950/50 dark:text-red-400 dark:border-red-400/35"
                data-testid="badge-priority"
              >
                High
              </span>
            )}
            {task.urgency === "medium" && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-600/35 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-400/35"
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
            <MapPin className="w-3.5 h-3.5 shrink-0 text-white/70" />
            <span className="text-sm text-white/70">
              {locationText}
            </span>
          </div>
        )}
        {task.estimatedCompletionDate && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-white/70" />
            <span className="text-sm text-white/70">
              Due {format(new Date(task.estimatedCompletionDate), "MMM d, yyyy")}
            </span>
          </div>
        )}
      </div>

      {/* Two-Tab Navigation */}
      <div
        className="flex shrink-0 bg-background border-b border-border"
        data-testid="tech-tabs"
      >
        {(["task", "more"] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              activeTab === tab
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent"
            }`}
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            {tab === "task" ? "Task" : "More"}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-36" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="px-2.5 py-2 space-y-2">
          {activeTab === "task" ? (
            <>
              {/* Estimate pending banner */}
              {estimateBlocksCompletion && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                  data-testid="banner-estimate-pending"
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Estimate pending approval
                    </p>
                    <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-400">
                      This task cannot be completed until the estimate is approved by an admin.
                    </p>
                  </div>
                </div>
              )}

              {/* Card 1 — Instructions */}
              {task.instructions && (
                <div
                  className="p-3 rounded-xl bg-background border border-border"
                  data-testid="card-instructions"
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2 text-muted-foreground"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Instructions
                  </p>
                  <div
                    className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                    style={{ borderRadius: 9 }}
                  >
                    <p
                      className="text-xs whitespace-pre-wrap text-indigo-900 dark:text-indigo-200"
                      style={{ lineHeight: 1.65 }}
                    >
                      {task.instructions}
                    </p>
                  </div>
                </div>
              )}

              {task.description && !task.instructions && (
                <div
                  className="p-3 rounded-xl bg-background border border-border"
                  data-testid="card-description"
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2 text-muted-foreground"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Description
                  </p>
                  <p className="text-sm text-foreground" style={{ lineHeight: 1.65 }}>
                    {task.description}
                  </p>
                </div>
              )}

              {/* Card 2 — Subtasks */}
              {subTasks.length > 0 && (
                <div
                  className="p-3 rounded-xl bg-background border border-border"
                  data-testid="card-subtasks"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[10px] uppercase font-medium text-muted-foreground"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      Subtasks
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {completedSubTasks} / {subTasks.length}
                    </span>
                  </div>
                  <div
                    className="rounded-full mb-3 overflow-hidden bg-muted"
                    style={{ height: 3 }}
                  >
                    <div
                      className="h-full rounded-full transition-all bg-primary"
                      style={{ width: `${subTaskProgress}%` }}
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
                          className="flex items-center gap-3 py-2 cursor-pointer rounded-md hover-elevate"
                          onClick={() => taskStarted && safeNavigate(`/tasks/${st.id}`)}
                          data-testid={`subtask-row-${st.id}`}
                        >
                          <div
                            className={`flex items-center justify-center shrink-0 rounded-md ${isDone ? "bg-primary" : "border-2 border-muted-foreground/30"}`}
                            style={{ width: 22, height: 22 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!taskStarted) return;
                              const newStatus = isDone ? "not_started" : "completed";
                              props.updateSubtaskStatusMutation.mutate({ subtaskId: st.id, status: newStatus });
                            }}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span
                            className={`flex-1 ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                            style={{ fontSize: 13 }}
                          >
                            {st.name}
                          </span>
                          {taskStarted && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!taskStarted && (
                    <div
                      className="flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg bg-muted/50 border-t border-border"
                      data-testid="lock-banner-subtasks"
                    >
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Start the task to unlock subtasks
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Card 3 — Checklist */}
              {checklistGroups.length > 0 && (
                <div
                  className="p-3 rounded-xl bg-background border border-border"
                  data-testid="card-checklist"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[10px] uppercase font-medium text-muted-foreground"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      Checklist
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {completedChecklistItems} / {totalChecklistItems}
                    </span>
                  </div>
                  <div
                    className="rounded-full mb-3 overflow-hidden bg-muted"
                    style={{ height: 3 }}
                  >
                    <div
                      className="h-full rounded-full transition-all bg-primary"
                      style={{
                        width: totalChecklistItems > 0
                          ? `${(completedChecklistItems / totalChecklistItems) * 100}%`
                          : "0%",
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
                              className={`flex items-center justify-center shrink-0 ${isDone ? "bg-primary" : "border-2 border-muted-foreground/30"}`}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                              }}
                            >
                              {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span
                              className={`flex-1 ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                              style={{ fontSize: 13 }}
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
                className="p-3 rounded-xl bg-background border border-border"
                data-testid="card-notes-photos"
              >
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-[10px] uppercase font-medium text-muted-foreground"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Notes
                  </p>
                  {saveIndicator === "saving" && (
                    <span className="text-[10px] text-primary">
                      Saving...
                    </span>
                  )}
                  {saveIndicator === "saved" && (
                    <span className="text-[10px] text-green-600 dark:text-green-400">
                      Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Type your observations... auto-saved as you type"
                  rows={3}
                  className="w-full resize-none bg-transparent outline-none text-foreground"
                  style={{
                    border: "none",
                    fontSize: 13,
                    lineHeight: 1.5,
                    minHeight: 72,
                  }}
                  data-testid="textarea-auto-note"
                />
                {notes.filter((n) => n.id !== currentNoteId).length > 0 && (
                  <div className="space-y-2 mt-3">
                    {[...notes]
                      .filter((n) => n.id !== currentNoteId)
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .map((note) => (
                        <div
                          key={note.id}
                          className="px-2.5 py-2 rounded-lg bg-muted/50"
                          data-testid={`saved-note-${note.id}`}
                        >
                          <p className="text-xs text-foreground">
                            {note.content}
                          </p>
                          <p className="text-[10px] mt-1 text-muted-foreground">
                            {note.createdAt && format(new Date(note.createdAt), "h:mm a")}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {uploads.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase font-medium mb-2 text-muted-foreground tracking-wide">
                      Photos ({uploads.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {uploads.map((upload) => {
                        const isImage = upload.fileType?.startsWith("image/");
                        return (
                          <button
                            key={upload.id}
                            className="relative rounded-md overflow-hidden shrink-0 group"
                            style={{ width: 56, height: 56 }}
                            onClick={() => setPreviewUpload(upload)}
                            data-testid={`photo-thumb-${upload.id}`}
                          >
                            {isImage ? (
                              <img
                                src={toDisplayUrl(upload.objectUrl)}
                                alt={upload.fileName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
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
                  className="p-3 rounded-xl bg-background border border-border"
                  data-testid="card-contact"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center shrink-0 text-white text-xs font-medium rounded-full bg-emerald-600"
                      style={{ width: 34, height: 34 }}
                    >
                      {contactInitials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {contactName}
                      </p>
                      {contactPhone && (
                        <p className="text-[11px] text-muted-foreground">
                          Tap to call &middot; {contactPhone}
                        </p>
                      )}
                    </div>
                    {contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="flex items-center justify-center shrink-0 rounded-full bg-primary/10"
                        style={{ width: 30, height: 30 }}
                        data-testid="button-call-contact"
                      >
                        <Phone className="w-3.5 h-3.5 text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* More Tab — Actions Card */}
              <div
                className="p-3 rounded-xl bg-background border border-border"
                data-testid="card-actions"
              >
                {/* Estimate / Quote */}
                {task.requiresEstimate && (
                  <button
                    className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
                    onClick={() => setIsEstimateSheetOpen(true)}
                    data-testid="action-estimate"
                  >
                    <div
                      className="flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/30 rounded-lg"
                      style={{ width: 32, height: 32 }}
                    >
                      <CircleDollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Estimate / Quote
                      </p>
                      {existingQuote && (
                        <p className="text-[11px] text-muted-foreground">
                          {task.estimateStatus === "waiting_approval"
                            ? `Pending approval \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                            : task.estimateStatus === "approved"
                              ? `Approved \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                              : `$${(existingQuote.estimatedCost || 0).toFixed(2)}`}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </button>
                )}

                {/* Parts Used */}
                <button
                  className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
                  onClick={() => setIsPartModalOpen(true)}
                  data-testid="action-parts"
                >
                  <div
                    className="flex items-center justify-center shrink-0 bg-primary/10 rounded-lg"
                    style={{ width: 32, height: 32 }}
                  >
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Parts Used
                    </p>
                  </div>
                  <span
                    className={`text-xs shrink-0 ${parts.length > 0 ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {parts.length > 0 ? `${parts.length} added` : "None"}
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                </button>

                {/* Previous Work */}
                {previousWork.length > 0 && (
                  <button
                    className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
                    onClick={() => setIsPreviousWorkOpen(true)}
                    data-testid="action-previous-work"
                  >
                    <div
                      className="flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-950/30 rounded-lg"
                      style={{ width: 32, height: 32 }}
                    >
                      <History className="w-4 h-4 text-green-700 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Previous Work
                      </p>
                    </div>
                    <span
                      className="flex items-center justify-center text-xs font-medium shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                    >
                      {previousWork.length}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
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
                      className="flex items-center justify-center shrink-0 bg-muted rounded-lg"
                      style={{ width: 32, height: 32 }}
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Resources
                      </p>
                    </div>
                    <span className="text-xs shrink-0 text-muted-foreground">
                      {resourceDocs > 0 && `${resourceDocs} doc${resourceDocs !== 1 ? "s" : ""}`}
                      {resourceDocs > 0 && resourceVids > 0 && " \u00B7 "}
                      {resourceVids > 0 && `${resourceVids} vid`}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Show existing parts if any */}
              {parts.length > 0 && (
                <div
                  className="p-3 rounded-xl bg-background border border-border"
                  data-testid="card-parts-list"
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2 text-muted-foreground"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Parts Added
                  </p>
                  <div className="space-y-2">
                    {parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between py-1.5 border-b border-border/50"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {part.partName}
                          </p>
                          {part.notes && (
                            <p className="text-[11px] text-muted-foreground">
                              {part.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-foreground">
                            Qty: {part.quantity}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
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

      {/* Fixed Bottom Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom"
        style={{ padding: "8px 14px 16px" }}
        data-testid="tech-bottom-bar"
      >
        <div className="flex items-center gap-3">
          {/* Scan Button */}
          <button
            className="flex items-center justify-center shrink-0 border border-border rounded-[10px]"
            style={{ width: 44, height: 44 }}
            onClick={() => setIsScanEquipmentOpen(true)}
            disabled={isEquipmentLoading}
            data-testid="bottom-button-scan"
          >
            <QrCode className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Primary CTA */}
          {task.status === "completed" ? (
            <div
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-green-700"
            >
              <Check className="w-4 h-4" />
              Completed
            </div>
          ) : !taskStarted ? (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-primary transition-colors"
              onClick={handleStartTask}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-start"
            >
              <Play className="w-4 h-4" />
              Start Task
            </button>
          ) : isPaused ? (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-primary transition-colors"
              onClick={handleResume}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-resume"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          ) : (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-gray-600 dark:bg-gray-500 transition-colors"
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
                className={`flex items-center justify-center rounded-[10px] ${taskStarted ? "border-primary bg-primary/10" : "border-border"}`}
                style={{ width: 44, height: 44, borderWidth: 1, borderStyle: "solid" }}
              >
                <Camera
                  className={`w-5 h-5 ${taskStarted ? "text-primary" : "text-muted-foreground"}`}
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-pause-complete"
          >
            <p className="text-sm font-semibold mb-1 text-foreground">
              Timer running
            </p>
            <p className="text-xs mb-4 text-muted-foreground">
              What would you like to do?
            </p>
            <div className="space-y-2">
              <button
                className="w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 bg-gray-600 dark:bg-gray-500"
                onClick={handlePauseConfirm}
                disabled={stopTimerMutation.isPending}
                data-testid="button-pause-confirm"
              >
                <Pause className="w-4 h-4" />
                Pause — resume later
              </button>
              <button
                className={`w-full py-3 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 ${estimateBlocksCompletion ? "bg-muted-foreground opacity-70" : "bg-green-700 dark:bg-green-600"}`}
                onClick={handleMarkComplete}
                disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
                data-testid="button-mark-complete"
              >
                <Check className="w-4 h-4" />
                Mark as complete
              </button>
              {estimateBlocksCompletion && (
                <p className="text-[11px] text-center mt-1 text-amber-600 dark:text-amber-400" data-testid="text-estimate-block-reason">
                  Estimate must be approved before completing
                </p>
              )}
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center bg-muted border border-border text-muted-foreground"
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Estimates
              </p>
              <button onClick={() => setIsEstimateSheetOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {quotes.length > 0 && (
              <div className="space-y-2 mb-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    data-testid={`estimate-row-${quote.id}`}
                  >
                    {quote.vendorName && (
                      <p className="text-xs text-muted-foreground">
                        {quote.vendorName}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      ${(quote.estimatedCost || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      {quote.status === "approved" ? "Approved" : "Pending approval"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {task.estimateStatus !== "approved" && (
              <button
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border-2 border-dashed border-amber-600 text-amber-600 dark:text-amber-400 dark:border-amber-400 bg-transparent"
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-part"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Add Part
              </p>
              <button onClick={() => setIsPartModalOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
                  className="flex items-center justify-center shrink-0 border border-border rounded-lg"
                  style={{ width: 40, height: 40 }}
                  onClick={() => {
                    setIsPartModalOpen(false);
                    setIsScanPartOpen(true);
                  }}
                  data-testid="button-scan-part-qr"
                >
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {inventorySearchQuery && !selectedInventoryItemId && (
                <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                  {inventoryItems
                    ?.filter((item) =>
                      item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 cursor-pointer text-sm border-b border-border/50 text-foreground hover-elevate"
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
                  className="p-2 rounded-md text-sm font-medium bg-muted text-foreground"
                >
                  {inventoryItems.find((i) => i.id === selectedInventoryItemId)?.name}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
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
                  <Label className="text-xs font-medium text-muted-foreground">
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
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium bg-primary"
                  onClick={async () => {
                    try {
                      await addPartMutation.mutateAsync();
                      setIsPartModalOpen(false);
                    } catch {
                      // Error handled by mutation's onError (shows toast)
                    }
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
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-muted border border-border text-muted-foreground"
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[70vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-resources"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Resources
              </p>
              <button onClick={() => setIsResourcesOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
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
                      className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
                      onClick={() => window.open(toDisplayUrl(resource.url), "_blank")}
                      data-testid={`resource-row-${resource.id}`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${isVideo ? "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400" : "bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400"}`}
                      >
                        {isVideo ? "VID" : "PDF"}
                      </span>
                      <span className="text-sm flex-1 truncate text-foreground">
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Add Estimate
              </p>
              <button onClick={() => props.setIsAddQuoteDialogOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Estimated Cost
                </Label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
                <Label className="text-xs font-medium text-muted-foreground">
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
                <Label className="text-xs font-medium text-muted-foreground">
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
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium bg-primary"
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
                  className="px-6 py-3 rounded-lg text-sm bg-muted border border-border text-muted-foreground"
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
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-previous-work"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Previous Work
              </p>
              <button onClick={() => setIsPreviousWorkOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {previousWork.map((prevTask) => {
                const completedBy = users.find(u => u.id === prevTask.assignedToId);
                return (
                  <button
                    key={prevTask.id}
                    className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border"
                    onClick={() => {
                      setIsPreviousWorkOpen(false);
                      safeNavigate(`/tasks/${prevTask.id}`);
                    }}
                    data-testid={`previous-work-item-${prevTask.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {prevTask.name}
                        </p>
                        {prevTask.description && (
                          <p className="text-xs mt-0.5 line-clamp-2 text-muted-foreground">
                            {prevTask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {completedBy && (
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              {completedBy.firstName} {completedBy.lastName}
                            </span>
                          )}
                          {prevTask.updatedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewUpload && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          onClick={() => setPreviewUpload(null)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-photo-preview"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white truncate flex-1 mr-4">
                {previewUpload.fileName}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600"
                  style={{ width: 32, height: 32 }}
                  onClick={async () => {
                    try {
                      await deleteUploadMutation.mutateAsync(previewUpload.id);
                      setPreviewUpload(null);
                    } catch {}
                  }}
                  data-testid="button-delete-photo"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button
                  className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPreviewUpload(null)}
                  data-testid="button-close-photo-preview"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            {previewUpload.fileType?.startsWith("image/") ? (
              <img
                src={toDisplayUrl(previewUpload.objectUrl)}
                alt={previewUpload.fileName}
                className="w-full max-h-[70vh] object-contain rounded-lg"
                data-testid="img-photo-preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-foreground">{previewUpload.fileName}</p>
                <a
                  href={toDisplayUrl(previewUpload.objectUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 underline"
                >
                  Open file
                </a>
              </div>
            )}
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

      {/* Equipment Info Dialog */}
      <Dialog open={props.isEquipmentInfoOpen} onOpenChange={props.setIsEquipmentInfoOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-hidden flex flex-col p-0">
          {props.scannedEquipment && (() => {
            const CatIcon = EQUIPMENT_CATEGORY_ICONS[props.scannedEquipment.category] || Info;
            const catLabel = EQUIPMENT_CATEGORY_LABELS[props.scannedEquipment.category] || props.scannedEquipment.category;
            const condColor = CONDITION_COLORS[(props.scannedEquipment.condition || "").toLowerCase()] || "bg-muted text-muted-foreground border-transparent";
            return (
              <>
                <div className="flex items-start gap-3 p-4 border-b">
                  <div className="p-2 rounded-md bg-primary/10">
                    <CatIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base leading-tight" data-testid="text-scanned-equipment-name">{props.scannedEquipment.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{catLabel}</Badge>
                      {props.scannedEquipment.condition && (
                        <Badge className={`text-xs border ${condColor}`} variant="outline">{props.scannedEquipment.condition}</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => props.setIsEquipmentInfoOpen(false)} data-testid="button-close-equipment-info">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex border-b bg-muted/30">
                  {(["info", "history", "resources"] as const).map(tab => {
                    const counts: Record<string, number> = {
                      info: 0,
                      history: props.scannedEquipmentTasks.length,
                      resources: props.scannedEquipmentResources.length,
                    };
                    const labels: Record<string, string> = { info: "Info", history: "Work History", resources: "Resources" };
                    return (
                      <button
                        key={tab}
                        onClick={() => props.setEquipmentInfoTab(tab)}
                        className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${props.equipmentInfoTab === tab ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
                        data-testid={`tab-equipment-${tab}`}
                      >
                        {labels[tab]}
                        {counts[tab] > 0 && (
                          <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{counts[tab]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {props.equipmentInfoTab === "info" && (
                    <div className="space-y-4">
                      {(props.scannedEquipment as any).manufacturerImageUrl && (
                        <img
                          src={toDisplayUrl((props.scannedEquipment as any).manufacturerImageUrl)}
                          alt="Manufacturer"
                          className="w-full max-h-48 object-contain rounded-md border"
                          data-testid="img-manufacturer"
                        />
                      )}
                      {props.scannedEquipment.description && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                          <p className="text-sm">{props.scannedEquipment.description}</p>
                        </div>
                      )}
                      {props.scannedEquipment.serialNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Serial Number:</span>
                          <span className="font-mono font-medium">{props.scannedEquipment.serialNumber}</span>
                        </div>
                      )}
                      {props.scannedEquipment.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{props.scannedEquipment.notes}</p>
                        </div>
                      )}
                      {!props.scannedEquipment.description && !props.scannedEquipment.serialNumber && !props.scannedEquipment.notes && !(props.scannedEquipment as any).manufacturerImageUrl && (
                        <p className="text-sm text-muted-foreground text-center py-4">No additional details available</p>
                      )}
                    </div>
                  )}

                  {props.equipmentInfoTab === "history" && (
                    <div className="space-y-2">
                      {props.scannedEquipmentTasks.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No work history for this equipment</p>
                        </div>
                      ) : (
                        [...props.scannedEquipmentTasks]
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                          .map(t => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-md border hover-elevate cursor-pointer"
                              onClick={() => { props.setIsEquipmentInfoOpen(false); safeNavigate(`/tasks/${t.id}`); }}
                              data-testid={`history-task-${t.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{t.name}</p>
                                <p className="text-xs text-muted-foreground">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "Unknown date"}</p>
                              </div>
                              <Badge className={`text-xs shrink-0 ${statusColors[t.status] || ""}`} variant="outline">
                                {statusLabels[t.status] || t.status}
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {props.equipmentInfoTab === "resources" && (
                    <div className="space-y-2">
                      {props.scannedEquipmentResources.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No manuals or resources linked to this equipment</p>
                          <p className="text-xs text-muted-foreground mt-1">Admins can link resources in the Resource Library</p>
                        </div>
                      ) : (
                        props.scannedEquipmentResources.map((r: any) => {
                          const RIcon = RESOURCE_TYPE_ICONS[r.type] || FileText;
                          return (
                            <button
                              key={r.id}
                              className="w-full flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 text-left"
                              onClick={() => window.open(toDisplayUrl(r.url), "_blank")}
                              data-testid={`resource-item-${r.id}`}
                            >
                              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                                <RIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.title}</p>
                                {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
                                <p className="text-xs text-primary mt-0.5 capitalize">{r.type}</p>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Vehicle Info Dialog */}
      <Dialog open={props.isVehicleInfoOpen} onOpenChange={props.setIsVehicleInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Info</DialogTitle>
            <DialogDescription>Scanned vehicle details</DialogDescription>
          </DialogHeader>
          {props.scannedVehicle && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-scanned-vehicle-name">{props.scannedVehicle.make} {props.scannedVehicle.model} {props.scannedVehicle.year}</p>
                  <p className="text-sm text-muted-foreground">{props.scannedVehicle.vehicleId}</p>
                </div>
              </div>
              {props.scannedVehicle.vin && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                  <p className="text-sm font-mono">{props.scannedVehicle.vin}</p>
                </div>
              )}
              {props.scannedVehicle.licensePlate && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">License Plate</p>
                  <p className="text-sm">{props.scannedVehicle.licensePlate}</p>
                </div>
              )}
              {props.scannedVehicle.currentMileage && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mileage</p>
                  <p className="text-sm">{props.scannedVehicle.currentMileage.toLocaleString()} mi</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
