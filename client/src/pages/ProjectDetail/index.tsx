import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Edit, Plus, ChevronRight,
} from "lucide-react";
import { statusColors, priorityColors } from "@/lib/constants";
import { format } from "date-fns";
import { useProjectDetail } from "./useProjectDetail";
import { ProjectTaskTableRow } from "./ProjectTaskTableRow";
import { MobileTaskCard } from "./MobileTaskCard";
import { ProjectGanttChart } from "./ProjectGanttChart";
import { ProjectDetailDialogs } from "./ProjectDetailDialogs";
import { ProjectDetailSidebar } from "./ProjectDetailSidebar";

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

        <ProjectDetailSidebar
          project={project}
          isOverdue={isOverdue}
          getPropertyName={getPropertyName}
          rightTab={rightTab}
          setRightTab={setRightTab}
          comments={comments}
          commentsByDate={commentsByDate}
          getSenderInfo={getSenderInfo}
          getCommentAttachments={getCommentAttachments}
          getImageUrl={getImageUrl}
          commentText={commentText}
          setCommentText={setCommentText}
          handleCommentSubmit={handleCommentSubmit}
          handleFileAttachToComment={handleFileAttachToComment}
          handleDirectFileUpload={handleDirectFileUpload}
          addCommentMutation={addCommentMutation}
          activityEndRef={activityEndRef}
          projectUploads={projectUploads}
          imageUploads={imageUploads}
          fileUploads={fileUploads}
          setDeleteDialogOpen={setDeleteDialogOpen}
        />
      </div>

      <ProjectDetailDialogs
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        isHoldReasonDialogOpen={isHoldReasonDialogOpen}
        setIsHoldReasonDialogOpen={setIsHoldReasonDialogOpen}
        holdReason={holdReason}
        setHoldReason={setHoldReason}
        pendingStatusChange={pendingStatusChange}
        setPendingStatusChange={setPendingStatusChange}
        reviewEstimatesTaskId={reviewEstimatesTaskId}
        setReviewEstimatesTaskId={setReviewEstimatesTaskId}
        summaryTaskId={summaryTaskId}
        setSummaryTaskId={setSummaryTaskId}
        editForm={editForm}
        updateProjectMutation={updateProjectMutation}
        deleteProjectMutation={deleteProjectMutation}
        updateTaskStatusMutation={updateTaskStatusMutation}
        handleHoldReasonSubmit={handleHoldReasonSubmit}
        properties={properties}
        areas={areas}
      />
    </div>
  );
}
