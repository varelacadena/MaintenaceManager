import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Edit, Trash2, Plus, Calendar, DollarSign, Building2,
  ClipboardList, Clock, CheckCircle, AlertCircle, XCircle, FolderKanban,
  GanttChart, User as UserIcon, Flag, MapPin, AlertTriangle, Pencil,
  ClipboardCheck, Send, Paperclip, FileIcon, Download, Image as ImageIcon,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { statusColors, priorityColors, taskStatusColors } from "@/lib/constants";
import { EstimateReviewDialog } from "@/components/EstimateReviewDialog";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import type { Upload } from "@shared/schema";
import { format, parse } from "date-fns";
import { getAvatarColor } from "@/utils/taskUtils";
import { useProjectDetail } from "./useProjectDetail";
import { ProjectTaskTableRow } from "./ProjectTaskTableRow";
import { MobileTaskCard } from "./MobileTaskCard";
import { ProjectGanttChart } from "./ProjectGanttChart";

export default function ProjectDetail() {
  const ctx = useProjectDetail();
  const {
    user, isMobile, isAdmin, isLoading, projectId, project, tasks, analytics,
    properties, areas, allUsers, comments, projectUploads,
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
    userGroups, editForm,
    addCommentMutation, uploadToProjectMutation,
    updateTaskMutation, updateTaskStatusMutation,
    updateProjectMutation, deleteProjectMutation,
    handleCommentSubmit, handleFileAttachToComment, handleDirectFileUpload,
    handleStatusChange, handleHoldReasonSubmit,
    handleUrgencyChange, handleAssigneeChange,
    handlePropertyChange, handleTaskTypeChange, handleInlineEdit,
    getPropertyName, getAreaName,
    taskProgress, isOverdue, daysLeft,
    commentsByDate, getSenderInfo,
    imageUploads, fileUploads,
    getCommentAttachments, getImageUrl,
  } = ctx;

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
        <Link href="/work">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Work
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/work" className="hover:underline underline-offset-2" data-testid="link-breadcrumb-work">Work</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium" data-testid="text-breadcrumb-project">{project.name}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)} data-testid="button-edit-project">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Link href={`/tasks/new?projectId=${projectId}`}>
            <Button data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-2" />
              New task
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-project-name">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-project-subtitle">
              {project.description || project.status.replace(/_/g, " ")}
              {getPropertyName(project.propertyId) && ` · ${getPropertyName(project.propertyId)}`}
              {project.startDate && ` · ${format(new Date(project.startDate), "MMM d")}`}
              {project.targetEndDate && ` → ${format(new Date(project.targetEndDate), "MMM d, yyyy")}`}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={statusColors[project.status]} variant="secondary">
                {project.status.replace(/_/g, " ")}
              </Badge>
              <Badge className={priorityColors[project.priority]} variant="secondary">
                {project.priority}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" data-testid="badge-overdue">Overdue</Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Tasks</div>
                <div className="text-xl font-bold" data-testid="text-task-progress">
                  {analytics?.taskStats.completed || 0}/{analytics?.taskStats.total || 0}
                </div>
                <Progress value={taskProgress} className="mt-1.5 h-1" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Budget</div>
                <div className="text-xl font-bold" data-testid="text-budget">
                  ${(project.budgetAmount || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">allocated</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Time logged</div>
                <div className="text-xl font-bold" data-testid="text-time-logged">
                  {analytics?.time.totalHours || 0}h
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Days left</div>
                <div className={`text-xl font-bold ${daysLeft !== null && daysLeft < 0 ? "text-red-500 dark:text-red-400" : ""}`} data-testid="text-days-left">
                  {daysLeft !== null ? daysLeft : "—"}
                </div>
                {daysLeft !== null && daysLeft < 0 && (
                  <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">past due</div>
                )}
              </CardContent>
            </Card>
          </div>

          {analytics && analytics.taskStats.total > 0 && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-muted-foreground">{analytics.taskStats.notStarted} not started</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-muted-foreground">{analytics.taskStats.inProgress} in progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">{analytics.taskStats.completed} done</span>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Tasks</CardTitle>
              <Link href={`/tasks/new?projectId=${projectId}`}>
                <Button size="sm" data-testid="button-add-task-inline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add task
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                isMobile ? (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        allUsers={allUsers}
                        handleStatusChange={handleStatusChange}
                        handleUrgencyChange={handleUrgencyChange}
                        onReviewEstimates={(id) => setReviewEstimatesTaskId(id)}
                        isAdmin={isAdmin}
                        onViewSummary={(id) => setSummaryTaskId(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Task</TableHead>
                          <TableHead className="w-[50px]">Assignee</TableHead>
                          <TableHead className="min-w-[90px]">Due</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          <TableHead className="w-[80px]">Urgency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map((task) => (
                          <ProjectTaskTableRow
                            key={task.id}
                            task={task}
                            userGroups={userGroups}
                            allUsers={allUsers}
                            properties={properties}
                            handleStatusChange={handleStatusChange}
                            handleUrgencyChange={handleUrgencyChange}
                            handleAssigneeChange={handleAssigneeChange}
                            handlePropertyChange={handlePropertyChange}
                            handleInlineEdit={handleInlineEdit}
                            onReviewEstimates={(id) => setReviewEstimatesTaskId(id)}
                            isAdmin={isAdmin}
                            onViewSummary={(id) => setSummaryTaskId(id)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No tasks assigned to this project yet
                </p>
              )}
            </CardContent>
          </Card>

          <ProjectGanttChart tasks={tasks || []} project={project} />
        </div>

        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-details-heading">Details</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium text-right" data-testid="text-detail-property">{getPropertyName(project.propertyId) || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-medium" data-testid="text-detail-start">
                    {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Due</span>
                  <span className={`font-medium ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`} data-testid="text-detail-due">
                    {project.targetEndDate ? format(new Date(project.targetEndDate), "MMM d, yyyy") : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium" data-testid="text-detail-budget">${(project.budgetAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={rightTab} onValueChange={setRightTab}>
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">Activity</TabsTrigger>
              <TabsTrigger value="files" className="flex-1" data-testid="tab-files">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-3">
              <div className="border rounded-md">
                <div className="max-h-[450px] overflow-y-auto p-3 space-y-4" data-testid="activity-feed">
                  {(!comments || comments.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                  )}
                  {Object.entries(commentsByDate).map(([date, dateComments]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">{date}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {dateComments.map((comment) => {
                        const sender = getSenderInfo(comment.senderId);
                        if (comment.isSystem) {
                          return (
                            <div key={comment.id} className="flex items-center gap-2 py-1.5" data-testid={`comment-system-${comment.id}`}>
                              <Avatar className="w-7 h-7 shrink-0">
                                <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">SYS</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">{comment.content}</span>
                            </div>
                          );
                        }
                        const attachments = getCommentAttachments(comment.id);
                        return (
                          <div key={comment.id} className="flex gap-2 py-1.5" data-testid={`comment-${comment.id}`}>
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className={`${getAvatarColor(comment.senderId)} text-white text-xs font-medium`}>
                                {sender.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-medium text-sm">{sender.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {comment.createdAt ? format(new Date(comment.createdAt), "h:mm a") : ""}
                                </span>
                              </div>
                              <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
                              {attachments.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {attachments.map((att) => (
                                    att.fileType?.startsWith("image/") ? (
                                      <a
                                        key={att.id}
                                        href={getImageUrl(att)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block max-w-[200px] rounded-md overflow-hidden border"
                                        data-testid={`comment-image-${att.id}`}
                                      >
                                        <img
                                          src={getImageUrl(att)}
                                          alt={att.fileName}
                                          className="w-full object-cover"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        key={att.id}
                                        href={getImageUrl(att)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-1.5 rounded-md border text-xs hover-elevate"
                                        data-testid={`comment-file-${att.id}`}
                                      >
                                        <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{att.fileName}</span>
                                        <Download className="w-3 h-3 text-muted-foreground shrink-0" />
                                      </a>
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={activityEndRef} />
                </div>
                <div className="border-t p-2 flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={handleFileAttachToComment} data-testid="button-attach-file">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Comment..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                    data-testid="input-comment"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCommentSubmit}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    data-testid="button-send-comment"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-3">
              <div className="border rounded-md p-3 space-y-4" data-testid="files-section">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">Files & Photos</h4>
                  <Button size="sm" variant="outline" onClick={handleDirectFileUpload} data-testid="button-upload-file">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Upload
                  </Button>
                </div>

                {(!projectUploads || projectUploads.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">No files uploaded yet</p>
                )}

                {imageUploads.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Photos ({imageUploads.length})
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {imageUploads.map((upload) => (
                        <a
                          key={upload.id}
                          href={getImageUrl(upload)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-md overflow-hidden border hover-elevate"
                          data-testid={`image-upload-${upload.id}`}
                        >
                          <img
                            src={getImageUrl(upload)}
                            alt={upload.fileName}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {fileUploads.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      <FileIcon className="w-3.5 h-3.5" />
                      Files ({fileUploads.length})
                    </div>
                    <div className="space-y-1">
                      {fileUploads.map((upload) => (
                        <a
                          key={upload.id}
                          href={getImageUrl(upload)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-md hover-elevate text-sm group"
                          data-testid={`file-upload-${upload.id}`}
                        >
                          <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{upload.fileName}</span>
                          <Download className="w-3.5 h-3.5 text-muted-foreground invisible group-hover:visible shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setDeleteDialogOpen(true)}
            data-testid="button-delete-project"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Project
          </Button>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
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
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-property">
                            <SelectValue placeholder="No property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {properties?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project-area">
                            <SelectValue placeholder="No area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {areas?.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <DatePicker
                        value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="mm/dd/yyyy"
                        data-testid="input-edit-project-start-date"
                      />
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
                      <DatePicker
                        value={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="mm/dd/yyyy"
                        data-testid="input-edit-project-end-date"
                      />
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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

      <Dialog open={isHoldReasonDialogOpen} onOpenChange={(open) => {
        setIsHoldReasonDialogOpen(open);
        if (!open) { setHoldReason(""); setPendingStatusChange(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for placing this task on hold. The requester will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            placeholder="Enter reason..."
            className="resize-none"
            rows={3}
            data-testid="textarea-hold-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsHoldReasonDialogOpen(false); setHoldReason(""); setPendingStatusChange(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleHoldReasonSubmit}
              disabled={updateTaskStatusMutation.isPending}
              data-testid="button-confirm-hold"
            >
              {updateTaskStatusMutation.isPending ? "Saving..." : "Place On Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewEstimatesTaskId && (
        <EstimateReviewDialog
          taskId={reviewEstimatesTaskId}
          open={!!reviewEstimatesTaskId}
          onOpenChange={(open) => {
            if (!open) setReviewEstimatesTaskId(null);
          }}
        />
      )}

      {summaryTaskId && (
        <CompletedTaskSummary
          taskId={summaryTaskId}
          open={!!summaryTaskId}
          onOpenChange={(open) => {
            if (!open) setSummaryTaskId(null);
          }}
        />
      )}
    </div>
  );
}
