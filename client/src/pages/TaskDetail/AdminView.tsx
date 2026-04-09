import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Clock,
  User,
  Calendar,
  Plus,
  Play,
  Pause,
  Package,
  FileText,
  ExternalLink,
  Trash2,
  Paperclip,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  Building2,
  MapPin,
  Phone,
  DoorOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  StickyNote,
  History,
  UserPlus,
  Check,
  ListChecks,
  AlertTriangle,
  CircleDollarSign,
  Bot,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Link2,
  GripVertical,
  ScanLine,
  QrCode,
  Car,
  ArrowLeft,
  Search,
  Layers,
  ClipboardCheck,
  Globe,
  Users,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import { statusColors, quoteStatusColors, urgencyColors } from "./constants";
import { QuoteAttachmentsList, MultiPropertyDisplay, TaskResourcesSection } from "./helpers";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import { AdminDialogs } from "./AdminDialogs";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminView({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, navigate, toast, downloadFile,
    timeEntries, parts, notes, users, vendors, uploads,
    request, requestAttachments, property, multiProperties,
    equipment, space, checklistGroups, contactStaff, messages, quotes,
    allTasks, subTasks, vehicle, parentTask, allEquipment, allVehicles,
    taskDependencies, allTaskResources, previousWork,
    newNote, setNewNote, newMessage, setNewMessage,
    activeTimer, aiScheduleLog, aiScheduleLoading,
    selectedInventoryItemId, setSelectedInventoryItemId,
    partQuantity, setPartQuantity, partNotes, setPartNotes,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    isScanPartOpen, setIsScanPartOpen,
    isScanEquipmentOpen, setIsScanEquipmentOpen,
    scannedEquipment, scannedEquipmentTasks, scannedEquipmentResources,
    isEquipmentInfoOpen, setIsEquipmentInfoOpen,
    isEquipmentLoading, equipmentInfoTab, setEquipmentInfoTab,
    aiSuggestedParts, setAiSuggestedParts, isAiSuggestLoading,
    isQuickAddInventoryOpen, setIsQuickAddInventoryOpen,
    quickInventoryName, setQuickInventoryName,
    quickInventoryQuantity, setQuickInventoryQuantity,
    quickInventoryUnit, setQuickInventoryUnit,
    isStopTimerDialogOpen, setIsStopTimerDialogOpen,
    isResourcesSheetOpen, setIsResourcesSheetOpen,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason,
    isAddNoteDialogOpen, setIsAddNoteDialogOpen,
    noteType, setNoteType,
    inventorySearchQuery, setInventorySearchQuery,
    isAssignDialogOpen, setIsAssignDialogOpen,
    isHistorySheetOpen, setIsHistorySheetOpen,
    isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen,
    notesExpanded, setNotesExpanded,
    messagesExpanded, setMessagesExpanded,
    attachmentsExpanded, setAttachmentsExpanded,
    checklistExpanded, setChecklistExpanded,
    partsExpanded, setPartsExpanded,
    quotesExpanded, setQuotesExpanded,
    previousWorkExpanded, setPreviousWorkExpanded,
    isAddQuoteDialogOpen, setIsAddQuoteDialogOpen,
    newQuoteVendorId, setNewQuoteVendorId,
    newQuoteVendorName, setNewQuoteVendorName,
    newQuoteEstimatedCost, setNewQuoteEstimatedCost,
    newQuoteNotes, setNewQuoteNotes,
    pendingQuoteFiles, setPendingQuoteFiles,
    isAddVendorDialogOpen, setIsAddVendorDialogOpen,
    newVendorName, setNewVendorName,
    newVendorEmail, setNewVendorEmail,
    newVendorPhone, setNewVendorPhone,
    newVendorAddress, setNewVendorAddress,
    newVendorNotes, setNewVendorNotes,
    scannedVehicle, isVehicleInfoOpen, setIsVehicleInfoOpen,
    isAddSubTaskDialogOpen, setIsAddSubTaskDialogOpen,
    subTaskSearchQuery, setSubTaskSearchQuery,
    subTaskSearchType, setSubTaskSearchType,
    summaryTaskId, setSummaryTaskId,
    pendingUploadForLabel, isUploadLabelSaving,
    messagesEndRef, messagesSectionRef, partsSectionRef,
    safeNavigate, confirmLeave, cancelLeave,
    handleScanPart, handleEquipmentScan, handleAiSuggestParts,
    handleStartOrPause, handleComplete,
    handleRunAiSchedule, handleReviewAiSchedule,
    getUploadParameters, handleAutoSaveUpload,
    handleUploadLabelSave, handleUploadLabelCancel,
    inventoryItems,
    markAsReadMutation, sendMessageMutation, deleteMessageMutation,
    updateStatusMutation, updateSubtaskStatusMutation, updateTaskMutation,
    startTimerMutation, stopTimerMutation,
    quickAddInventoryMutation, addPartMutation,
    addNoteMutation, deleteNoteMutation,
    createQuoteMutation, approveQuoteMutation, rejectQuoteMutation, deleteQuoteMutation,
    createVendorMutation, addUploadMutation, deleteUploadMutation,
    toggleChecklistItemMutation, deleteTaskMutation, addSubTaskMutation,
    isTechnicianOrAdmin, taskWithHelpers, taskIsHelper, taskHelpers,
    estimateBlocksCompletion, assignedUser, adminUsers, technicianUsers,
    staffUsers, studentUsers, totalHours, remainingMins,
    dateLabel, isOverdue, totalChecklistItems, completedChecklistItems,
    isParentTask, isSubTask, completedSubTasks, subTaskProgress,
  } = ctx;

  if (!task) return null;

  return (
    <div className="flex flex-col h-full bg-background" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          {isSubTask && parentTask && (
            <button
              className="flex items-center gap-1.5 text-sm text-primary"
              onClick={() => safeNavigate(`/tasks/${task.parentTaskId}`)}
              data-testid="link-back-to-parent"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {parentTask.name}
            </button>
          )}
          {/* Task Header */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold leading-tight line-clamp-2" data-testid="text-task-name">
                  {task.name}
                </h1>
              </div>

              {isTechnicianOrAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-delete-task">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All associated data will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTaskMutation.mutate()}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`text-xs ${statusColors[task.status]}`} data-testid="badge-status">
                  {statusLabels[task.status]}
                </Badge>
                <Badge variant="outline" className={`text-xs capitalize ${urgencyColors[task.urgency]}`} data-testid="badge-urgency">
                  {task.urgency}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize" data-testid="badge-task-type">
                  {task.taskType.replace("_", " ")}
                </Badge>
                {task.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSummaryTaskId(task.id)}
                    data-testid="button-view-summary"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-1" />
                    View Summary
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span data-testid="text-assignee">
                    {task.assignedToId === user?.id 
                      ? "You"
                      : assignedUser?.firstName && assignedUser?.lastName 
                        ? `${assignedUser.firstName} ${assignedUser.lastName}` 
                        : task.assignedPool === "student_pool" 
                          ? "Student Pool"
                          : task.assignedPool === "technician_pool"
                            ? "Technician Pool"
                            : "Unassigned"}
                  </span>
                </div>
                {taskHelpers.length > 0 && (
                  <div className="flex items-center gap-1" data-testid="text-helpers-count">
                    <Users className="w-3.5 h-3.5" />
                    <span>{taskHelpers.length} helper{taskHelpers.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span data-testid="text-due-date">{dateLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {task.requiresEstimate && (
            task.estimateStatus === "needs_estimate" ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md" data-testid="banner-estimate-needs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">This task requires an estimate. Estimates must be submitted and approved before completion.</p>
              </div>
            ) : task.estimateStatus === "waiting_approval" ? (
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md" data-testid="banner-estimate-waiting">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <p className="text-sm text-purple-800 dark:text-purple-300">Estimates submitted and pending approval.</p>
              </div>
            ) : task.estimateStatus === "approved" ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md" data-testid="banner-estimate-approved">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300">Estimate approved — this task can be completed.</p>
              </div>
            ) : null
          )}

          {/* Location - Clickable for admin/tech only */}
          {task?.isCampusWide && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20" data-testid="display-campus-wide">
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">All Campus Buildings</p>
                <p className="text-sm text-muted-foreground">This task applies to all campus buildings</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">Campus-Wide</Badge>
            </div>
          )}

          {!task?.isCampusWide && multiProperties.length > 0 && (
            <MultiPropertyDisplay
              properties={multiProperties}
              isTechnicianOrAdmin={isTechnicianOrAdmin}
              safeNavigate={safeNavigate}
            />
          )}

          {!task?.isCampusWide && multiProperties.length === 0 && property && (
            isTechnicianOrAdmin ? (
              <div 
                onClick={() => safeNavigate(`/properties/${property.id}`)}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-md hover-elevate active-elevate-2 cursor-pointer" 
                data-testid="link-property"
              >
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-property">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{property.name}</p>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                </div>
              </div>
            )
          )}

          {!task?.isCampusWide && multiProperties.length === 0 && !property && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md border border-dashed border-muted-foreground/20" data-testid="display-no-location">
              <MapPin className="w-5 h-5 text-muted-foreground/50 shrink-0" />
              <p className="text-sm text-muted-foreground">No location assigned</p>
            </div>
          )}

          {/* Space if present */}
          {!task?.isCampusWide && multiProperties.length === 0 && space && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-space">
              <DoorOpen className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{space.name}</p>
                {space.floor && (
                  <p className="text-sm text-muted-foreground">Floor {space.floor}</p>
                )}
              </div>
            </div>
          )}

          {/* Equipment if present */}
          {!task?.isCampusWide && multiProperties.length === 0 && equipment && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md" data-testid="display-equipment">
              <Package className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{equipment.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{equipment.category}</p>
              </div>
            </div>
          )}

          {isParentTask && (
            <div className="space-y-3" data-testid="subtasks-section">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Sub-Tasks
                </p>
                <span className="text-sm text-muted-foreground" data-testid="text-subtask-progress">
                  {completedSubTasks} of {subTasks.length} complete
                </span>
              </div>
              <Progress value={subTaskProgress} className="h-2" data-testid="progress-subtasks" />
              <div className="space-y-2">
                {subTasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => safeNavigate(`/tasks/${st.id}`)}
                    data-testid={`subtask-card-${st.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {st.vehicleId ? (
                        <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{st.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[st.status] || ""}`}>
                      {statusLabels[st.status] || st.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsScanEquipmentOpen(true)}
                disabled={isEquipmentLoading}
                data-testid="button-add-subtask-scan"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR to Add Sub-Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAddSubTaskDialogOpen(true)}
                data-testid="button-add-subtask-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Equipment / Vehicle
              </Button>
            </div>
          )}

          {/* Previous Work at this Property/Equipment - Technician & Admin */}
          {isTechnicianOrAdmin && previousWork.length > 0 && (
            <Collapsible open={previousWorkExpanded} onOpenChange={setPreviousWorkExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-md text-left" data-testid="toggle-previous-work">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">Previous Work Here</span>
                    <Badge variant="secondary" className="text-xs">{previousWork.length}</Badge>
                  </div>
                  {previousWorkExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {previousWork.map((prevTask) => {
                  const completedBy = users.find(u => u.id === prevTask.assignedToId);
                  const isEquipmentMatch = task.equipmentId && prevTask.equipmentId === task.equipmentId;
                  return (
                    <div
                      key={prevTask.id}
                      className="p-3 rounded-md border border-border/50 cursor-pointer hover-elevate"
                      onClick={() => navigate(`/tasks/${prevTask.id}`)}
                      data-testid={`previous-work-item-${prevTask.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{prevTask.name}</p>
                          {prevTask.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{prevTask.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {completedBy && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {completedBy.firstName} {completedBy.lastName}
                              </span>
                            )}
                            {prevTask.updatedAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                              </span>
                            )}
                            {isEquipmentMatch && (
                              <Badge variant="outline" className="text-xs">Same Equipment</Badge>
                            )}
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Instructions - Important for student tasks */}
          {task.instructions && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="task-instructions">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Instructions</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{task.instructions}</p>
                </div>
              </div>
            </div>
          )}

          {taskHelpers.length > 0 && (
            <div className="p-4 bg-muted/30 border rounded-lg" data-testid="task-helpers-section">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-2">Student Helpers</p>
                  <div className="flex flex-wrap gap-2">
                    {taskHelpers.map((h: { userId: string; user?: { id: string; name: string; email: string; role: string } }) => (
                      <Badge key={h.userId} variant="secondary" data-testid={`badge-helper-${h.userId}`}>
                        {h.user?.name || "Unknown"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {allTaskResources.length > 0 && (
            <TaskResourcesSection resources={allTaskResources} propertyName={property?.name} />
          )}

          {/* Time Logged - Prominent Display for Students */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid="time-logged-card">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTimer ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Logged</p>
                <p className="text-2xl font-bold" data-testid="text-time-logged">{totalHours}h {remainingMins}m</p>
              </div>
            </div>
            {activeTimer && (
              <Badge variant="default" className="animate-pulse">
                Timer Running
              </Badge>
            )}
          </div>

          {/* Quick Action Buttons - Admin/Technician Only */}
          {isTechnicianOrAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignDialogOpen(true)}
                data-testid="button-assign"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                {assignedUser ? "Reassign" : "Assign"}
              </Button>

              {task.requestId && (
                <Button 
                  variant="outline"
                  size="sm"
                  data-testid="link-original-request"
                  onClick={() => safeNavigate(`/requests/${task.requestId}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Request
                </Button>
              )}

            <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-history">
                  <History className="w-4 h-4 mr-1" />
                  History
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Task History</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(70vh-80px)]">
                  {timeEntries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No time entries yet</p>
                  ) : (
                    timeEntries.map((entry) => {
                      const entryUser = users.find(u => u.id === entry.userId);
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          <div>
                            <p className="text-sm font-medium">
                              {entryUser?.firstName} {entryUser?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                            </p>
                          </div>
                          {entry.durationMinutes ? (
                            <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                          ) : (
                            <Badge variant="outline" className="animate-pulse">Running</Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>
            </div>
          )}

          {/* Editable Details Section */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            {/* Contact Phone - Tap to call */}
            {(task.contactPhone || contactStaff?.phoneNumber) && (
              <a
                href={`tel:${task.contactPhone || contactStaff?.phoneNumber}`}
                className="flex items-center gap-3 p-3 bg-background rounded-md hover-elevate active-elevate-2"
                data-testid="link-phone"
              >
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{task.contactPhone || contactStaff?.phoneNumber}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            )}

            {/* Status - Editable */}
            {isTechnicianOrAdmin && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-blue-500" :
                    task.status === "on_hold" ? "bg-yellow-500" : "bg-gray-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Select
                    value={task.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      {!estimateBlocksCompletion && (
                        <SelectItem value="completed">Completed</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Priority - Editable */}
            {isTechnicianOrAdmin && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                <AlertTriangle className={`w-5 h-5 ${
                  task.urgency === "high" ? "text-red-500" :
                  task.urgency === "medium" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Select
                    value={task.urgency}
                    onValueChange={(value) => updateTaskMutation.mutate({ urgency: value as "low" | "medium" | "high" })}
                    disabled={updateTaskMutation.isPending}
                  >
                    <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0 capitalize" data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

          </div>

          {/* AI Schedule Suggestion - admin only, when no assignee or due date */}
          {user?.role === "admin" && (!task.assignedToId || !task.estimatedCompletionDate) && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Scheduling</span>
                  {aiScheduleLog && (
                    <Badge variant={aiScheduleLog.status === "approved" ? "default" : aiScheduleLog.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {aiScheduleLog.status === "pending_review" ? "Pending Review" : aiScheduleLog.status === "approved" ? "Applied" : "Rejected"}
                    </Badge>
                  )}
                </div>
                {!aiScheduleLog && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunAiSchedule}
                    disabled={aiScheduleLoading}
                    data-testid="button-ai-schedule"
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiScheduleLoading ? "Analyzing..." : "Suggest Schedule"}
                  </Button>
                )}
              </div>
              {aiScheduleLog?.proposedValue && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground italic">{aiScheduleLog.reasoning}</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Assignee</span>
                      <p className="font-medium">{aiScheduleLog.proposedValue.suggestedAssigneeName || aiScheduleLog.proposedValue.assigneeName || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Start Date</span>
                      <p className="font-medium">{aiScheduleLog.proposedValue.suggestedStartDate || aiScheduleLog.proposedValue.startDate || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Due Date</span>
                      <p className="font-medium">{aiScheduleLog.proposedValue.suggestedDueDate || aiScheduleLog.proposedValue.dueDate || "—"}</p>
                    </div>
                  </div>
                  {aiScheduleLog.status === "pending_review" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleReviewAiSchedule("approved")} className="gap-1.5 text-green-600" data-testid="button-accept-schedule">
                        <ThumbsUp className="h-3.5 w-3.5" /> Apply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReviewAiSchedule("rejected")} className="gap-1.5 text-muted-foreground" data-testid="button-reject-schedule">
                        <ThumbsDown className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dependencies - admin only */}
          {user?.role === "admin" && taskDependencies.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Blocked By</span>
              </div>
              <div className="space-y-1.5">
                {taskDependencies.map((dep: any) => {
                  const depTask = allTasks.find((t: any) => t.id === dep.dependsOnTaskId);
                  return (
                    <div key={dep.id} className="flex items-center gap-2 text-sm">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{depTask?.name || dep.dependsOnTaskId}</span>
                      <Badge variant="outline" className="text-xs capitalize ml-auto">{dep.dependencyType?.replace("_", " ") || "finish to start"}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description Block */}
          {task.description && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed" data-testid="text-description">{task.description}</p>
            </div>
          )}

          {/* Checklists - Collapsible */}
          {checklistGroups.length > 0 && (
            <Collapsible open={checklistExpanded} onOpenChange={setChecklistExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-checklist">
                  <div className="flex items-center gap-3">
                    <ListChecks className="w-5 h-5 text-primary" />
                    <span className="font-medium">Checklists</span>
                    <Badge variant="secondary">{completedChecklistItems}/{totalChecklistItems}</Badge>
                  </div>
                  {checklistExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                {checklistGroups.map((group) => (
                  <div key={group.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <p className="font-medium text-sm">{group.name}</p>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-background rounded-lg cursor-pointer hover-elevate active-elevate-2 min-h-[56px]"
                        onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <Checkbox checked={item.isCompleted} className="w-6 h-6" />
                        <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Notes - Collapsible */}
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-notes">
                <div className="flex items-center gap-3">
                  <StickyNote className="w-5 h-5 text-primary" />
                  <span className="font-medium">Notes</span>
                  {notes.length > 0 && <Badge variant="secondary">{notes.length}</Badge>}
                </div>
                {notesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No notes yet</p>
              ) : (
                notes.map((note) => {
                  const noteUser = users.find(u => u.id === note.userId);
                  const canDelete = user?.role === "admin" || note.userId === user?.id;
                  return (
                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{noteUser?.firstName} {noteUser?.lastName}</span>
                          <Badge variant="outline" className="text-xs py-0">
                            {note.noteType === "job_note" ? "Note" : "Recommendation"}
                          </Badge>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Time History - Show user's own entries for students, all entries for admin/tech */}
          {(() => {
            const myEntries = timeEntries.filter(e => e.userId === user?.id);
            const entriesToShow = isTechnicianOrAdmin ? timeEntries : myEntries;
            
            if (entriesToShow.length === 0) return null;
            
            return (
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <History className="w-5 h-5 text-primary" />
                  <span className="font-medium">{isTechnicianOrAdmin ? "Time Log" : "My Time Log"}</span>
                </div>
                <div className="space-y-2">
                  {entriesToShow.slice(0, 5).map((entry) => {
                    const entryUser = users.find(u => u.id === entry.userId);
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-background rounded-md" data-testid={`time-entry-${entry.id}`}>
                        <div className="flex-1">
                          <p className="text-sm">
                            {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                          </p>
                          {isTechnicianOrAdmin && entryUser && (
                            <p className="text-xs text-muted-foreground">
                              {entryUser.firstName} {entryUser.lastName}
                            </p>
                          )}
                        </div>
                        {entry.durationMinutes ? (
                          <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                        ) : (
                          <Badge variant="default" className="animate-pulse">Running</Badge>
                        )}
                      </div>
                    );
                  })}
                  {entriesToShow.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      +{entriesToShow.length - 5} more entries
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Messages - Collapsible (Only for Maintenance/Admin) */}
          {isTechnicianOrAdmin && (
            <Collapsible open={messagesExpanded} onOpenChange={setMessagesExpanded}>
              <CollapsibleTrigger asChild>
                <div ref={messagesSectionRef} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-messages">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <span className="font-medium">Messages</span>
                    {messages.length > 0 && <Badge variant="secondary">{messages.length}</Badge>}
                  </div>
                  {messagesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No messages yet</p>
                ) : (
                  messages.map((message) => {
                    const sender = users.find(u => u.id === message.senderId);
                    const isOwnMessage = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${isOwnMessage ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{sender?.firstName} {sender?.lastName}</span>
                          {user?.role === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => deleteMessageMutation.mutate(message.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    );
                  })
                )}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMessage.trim()) {
                        sendMessageMutation.mutate(newMessage.trim());
                      }
                    }}
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    onClick={() => newMessage.trim() && sendMessageMutation.mutate(newMessage.trim())}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Attachments - Collapsible */}
          <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-attachments">
                <div className="flex items-center gap-3">
                  <Paperclip className="w-5 h-5 text-primary" />
                  <span className="font-medium">Attachments</span>
                  {(uploads.length + requestAttachments.length) > 0 && (
                    <Badge variant="secondary">{uploads.length + requestAttachments.length}</Badge>
                  )}
                </div>
                {attachmentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {requestAttachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground px-1">From Request</p>
                  {requestAttachments.map((att) => {
                    const isMockFile = att.objectUrl.includes("mock-storage.local");
                    return (
                      <button
                        key={att.id}
                        onClick={() => downloadFile(att.id, att.objectUrl)}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate w-full text-left"
                      >
                        {isMockFile ? (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm flex-1 truncate">{att.fileName}</span>
                        {isMockFile ? (
                          <span className="text-xs text-destructive">Unavailable</span>
                        ) : (
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {uploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground px-1">Task Attachments</p>
                  {uploads.map((upload) => {
                    const isMockFile = upload.objectUrl.includes("mock-storage.local");
                    return (
                      <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <button
                          onClick={() => downloadFile(upload.id, upload.objectUrl)}
                          className="flex items-center gap-3 flex-1 min-w-0 hover-elevate text-left"
                        >
                          {isMockFile ? (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-primary" />
                          )}
                          <span className="text-sm truncate">{upload.fileName}</span>
                          {isMockFile && (
                            <span className="text-xs text-destructive">Unavailable</span>
                          )}
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUploadMutation.mutate(upload.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })}
                </div>
              )}
              {uploads.length === 0 && requestAttachments.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No attachments</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Estimates - Collapsible (only for tasks requiring estimates) */}
          {task?.requiresEstimate && isTechnicianOrAdmin && (
            <Collapsible open={quotesExpanded} onOpenChange={setQuotesExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-quotes">
                  <div className="flex items-center gap-3">
                    <CircleDollarSign className="w-5 h-5 text-primary" />
                    <span className="font-medium">Estimates</span>
                    {quotes.length > 0 && <Badge variant="secondary">{quotes.length}</Badge>}
                    {task?.estimateStatus === "needs_estimate" && (
                      <Badge variant="outline" className={statusColors.needs_estimate}>Needs Estimate</Badge>
                    )}
                    {task?.estimateStatus === "waiting_approval" && (
                      <Badge variant="outline" className={statusColors.waiting_approval}>Pending Review</Badge>
                    )}
                    {task?.estimateStatus === "approved" && (
                      <Badge variant="outline" className={statusColors.ready}>Approved</Badge>
                    )}
                  </div>
                  {quotesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                {/* Add Estimate Button */}
                {task?.estimateStatus !== "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddQuoteDialogOpen(true)}
                    className="w-full"
                    data-testid="button-add-quote"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Estimate
                  </Button>
                )}

                {quotes.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No estimates added yet. Add estimates to compare and approve before work begins.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {quotes.map((quote) => {
                      const quoteCreator = users.find(u => u.id === quote.createdById);
                      const isOwnQuote = user?.id === quote.createdById;
                      const canModify = user?.role === "admin" || isOwnQuote;

                      return (
                        <div
                          key={quote.id}
                          className={`p-4 rounded-lg border ${
                            quote.status === "approved" ? "border-green-500/50 bg-green-500/5" : 
                            quote.status === "rejected" ? "border-red-500/30 bg-red-500/5 opacity-60" : 
                            "border-border"
                          }`}
                          data-testid={`quote-card-${quote.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-semibold text-lg">
                                  ${(quote.estimatedCost || 0).toLocaleString()}
                                </span>
                                <Badge variant="secondary" className={quoteStatusColors[quote.status]}>
                                  {quote.status}
                                </Badge>
                              </div>
                              {quote.vendorName && (
                                <p className="text-sm text-muted-foreground">
                                  Vendor: {quote.vendorName}
                                </p>
                              )}
                              {quoteCreator && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Submitted by {quoteCreator.firstName && quoteCreator.lastName ? `${quoteCreator.firstName} ${quoteCreator.lastName}` : quoteCreator.username}
                                </p>
                              )}
                              {quote.notes && (
                                <p className="text-sm mt-2">{quote.notes}</p>
                              )}
                              <QuoteAttachmentsList quoteId={quote.id} />
                            </div>
                            <div className="flex gap-2">
                              {quote.status === "draft" && task?.estimateStatus !== "approved" && (
                                <>
                                  {user?.role === "admin" && (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => approveQuoteMutation.mutate(quote.id)}
                                        disabled={approveQuoteMutation.isPending}
                                        data-testid={`button-approve-quote-${quote.id}`}
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => rejectQuoteMutation.mutate(quote.id)}
                                        disabled={rejectQuoteMutation.isPending}
                                        data-testid={`button-reject-quote-${quote.id}`}
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {canModify && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteQuoteMutation.mutate(quote.id)}
                                      disabled={deleteQuoteMutation.isPending}
                                      data-testid={`button-delete-quote-${quote.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                              {quote.status === "approved" && (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Parts Used - Collapsible */}
          {isTechnicianOrAdmin && (
            <Collapsible open={partsExpanded} onOpenChange={setPartsExpanded}>
              <CollapsibleTrigger asChild>
                <div ref={partsSectionRef} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-parts">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-medium">Parts Used</span>
                    {parts.length > 0 && <Badge variant="secondary">{parts.length}</Badge>}
                  </div>
                  {partsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {parts.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No parts used</p>
                ) : (
                  parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{part.partName}</p>
                        {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Qty: {part.quantity}</p>
                        <p className="text-xs text-muted-foreground">${part.cost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddPartDialogOpen(true)}
                  data-testid="button-add-part"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto gap-2">
          {isParentTask ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2" data-testid="bottom-parent-info">
              <Layers className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{completedSubTasks} of {subTasks.length} sub-tasks complete</span>
            </div>
          ) : task.status === "completed" ? (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5 text-green-600 dark:text-green-400"
              disabled
              data-testid="bottom-button-done"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-xs font-medium">Completed</span>
            </Button>
          ) : activeTimer ? (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5"
              onClick={handleStartOrPause}
              disabled={stopTimerMutation.isPending}
              data-testid="bottom-button-pause"
            >
              <Pause className="w-6 h-6" />
              <span className="text-xs font-medium">Pause Timer</span>
            </Button>
          ) : task.status === "in_progress" ? (
            <div className="flex flex-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-14 flex-col gap-0.5"
                onClick={handleStartOrPause}
                disabled={startTimerMutation.isPending}
                data-testid="bottom-button-resume"
              >
                <Play className="w-6 h-6" />
                <span className="text-xs font-medium">Resume</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-14 flex-col gap-0.5 bg-green-600"
                onClick={handleComplete}
                disabled={updateStatusMutation.isPending || !!estimateBlocksCompletion}
                title={estimateBlocksCompletion ? "Estimates must be approved first" : undefined}
                data-testid="bottom-button-complete"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xs font-medium">{estimateBlocksCompletion ? "Estimate Required" : "Complete"}</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-14 flex-col gap-0.5"
              onClick={handleStartOrPause}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-start"
            >
              <Play className="w-6 h-6" />
              <span className="text-xs font-medium">Start Task</span>
            </Button>
          )}

          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={10485760}
            onGetUploadParameters={getUploadParameters}
            onComplete={handleAutoSaveUpload}
            onError={(error) => {
              toast({ title: "Upload failed", description: error.message, variant: "destructive" });
            }}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            buttonClassName="h-14 px-4 flex-col gap-0.5 w-full"
            buttonVariant="ghost"
            buttonTestId="bottom-button-upload"
            isLoading={addUploadMutation.isPending}
          >
            <Paperclip className="w-5 h-5" />
            <span className="text-xs">Photos/Docs</span>
          </ObjectUploader>

          <Button
            variant="ghost"
            size="sm"
            className="flex-col gap-0.5 h-14 px-3"
            onClick={() => setIsScanEquipmentOpen(true)}
            disabled={isEquipmentLoading}
            data-testid="bottom-button-scan-equipment"
          >
            {isEquipmentLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <ScanLine className="w-5 h-5" />
            )}
            <span className="text-xs">Scan</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-12 flex-col gap-0.5"
            onClick={() => setIsAddNoteDialogOpen(true)}
            data-testid="bottom-button-add-note"
          >
            <StickyNote className="w-5 h-5" />
            <span className="text-xs">Note</span>
          </Button>
        </div>
      </div>

      <AdminDialogs ctx={ctx} />
    </div>
  );
}
