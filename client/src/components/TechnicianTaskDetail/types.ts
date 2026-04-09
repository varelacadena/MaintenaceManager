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

export type ChecklistGroupWithItems = TaskChecklistGroup & { items: TaskChecklistItem[] };

export interface TaskHelperDisplay {
  userId: string;
  user?: { id: string; name: string; email: string; role: string };
}

export interface TechnicianTaskDetailProps {
  task: Task;
  user: UserType;
  property?: Property;
  multiProperties?: Property[];
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
  taskHelpers?: TaskHelperDisplay[];
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

export const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  needs_estimate: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  waiting_approval: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
};

export function getGradient(status: string, isPaused: boolean): string {
  if (isPaused) return "linear-gradient(135deg, #374151 0%, #4B5563 100%)";
  if (status === "in_progress") return "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 55%, #3b82f6 100%)";
  if (status === "waiting_approval") return "linear-gradient(135deg, #92400E 0%, #D97706 60%, #F59E0B 100%)";
  return "linear-gradient(135deg, #3730A3 0%, #4338CA 60%, #6366F1 100%)";
}

export function getStatusLabel(status: string, isPaused: boolean): string {
  if (isPaused) return "Paused";
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "waiting_approval") return "Waiting Approval";
  return "Not Started";
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
