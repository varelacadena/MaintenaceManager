import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FolderKanban, Search } from "lucide-react";
import { Link } from "wouter";
import { EstimateReviewDialog } from "@/components/EstimateReviewDialog";
import { CompletedTaskSummary } from "@/components/CompletedTaskSummary";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import type { Task, Project } from "@shared/schema";
import { TaskTableRow } from "./TaskTableRow";
import { ParentTaskRowGroup } from "./ParentTaskRowGroup";
import { ProjectRowGroup } from "./ProjectRowGroup";
import { unifiedStatusConfig } from "./constants";
import { ProjectsTab } from "./ProjectsTab";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { WorkLoadError } from "./WorkLoadError";
import { WorkTasksEmptyState } from "./WorkTasksEmptyState";
import { WorkStatusGroupHeader, workStatusGroupPanelId } from "./WorkStatusGroupHeader";
import type { WorkContext } from "./useWorkAdmin";

export function AdminWorkView({ ctx }: { ctx: WorkContext }) {
  const {
    user, navigate,
    searchQuery, setSearchQuery,
    activeTab, setActiveTab,
    collapsedGroups, toggleGroup,
    toggleProjectExpanded, expandedProjects,
    toggleParentTaskExpanded, expandedParentTasks,
    projectDialogOpen, setProjectDialogOpen,
    reviewEstimatesTaskId, setReviewEstimatesTaskId,
    summaryTaskId, setSummaryTaskId,
    selectedTaskId, closeTaskPanel,
    isPanelFullscreen, setIsPanelFullscreen,
    panelMounted, panelVisible,
    isHoldReasonDialogOpen, setIsHoldReasonDialogOpen,
    holdReason, setHoldReason, closeHoldReasonDialog,
    updateTaskStatusMutation,
    handleStatusChange, handleHoldReasonSubmit, handleInlineEdit,
    handleSelectTask, handleUrgencyChange, handleAssigneeChange,
    handlePropertyChange,
    handleProjectStatusChange,
    getPropertyName,
    allUsers, properties,
    subTasksMap, projectTasksMap, allProjectTasksMap,
    unifiedGroups, boardItemCount, userGroups,
    isAdmin,
    tasksError, tasksErrorMessage, refetchTasks,
  } = ctx;

  return (
    <>
      <div className={`flex ${panelMounted ? "-mx-8 -mt-6 overflow-hidden" : ""}`} style={panelMounted ? { height: "calc(100vh - 49px)" } : undefined}>
        <div
          className={`flex-1 min-w-0 overflow-y-auto ${panelMounted && isPanelFullscreen ? "hidden" : ""}`}
          style={{ transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
                  {user?.role === "admin" ? "Work" : "My Tasks"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.role === "admin"
                    ? "Manage tasks and projects in one place"
                    : "View and manage your assigned tasks"}
                </p>
              </div>
              {user?.role === "admin" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === "tasks" && (
                    <Link href="/tasks/new">
                      <Button data-testid="button-create-task">
                        <Plus className="w-4 h-4 mr-2" />
                        New Task
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setProjectDialogOpen(true)}
                    data-testid="button-new-project"
                  >
                    <FolderKanban className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </div>
              )}
              {user?.role !== "admin" && (
                <Link href="/tasks/new">
                  <Button data-testid="button-create-task" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </Link>
              )}
            </div>

            {user?.role === "admin" && (
              <div className="space-y-3">
                <div className="flex gap-1 bg-muted rounded-md p-1" data-testid="work-tabs" role="tablist" aria-label="Work views">
                  {([["tasks", "Tasks"], ["projects", "Projects"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === value}
                      onClick={() => setActiveTab(value)}
                      className={`flex-1 px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                        activeTab === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover-elevate"
                      }`}
                      data-testid={`tab-${value}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tasksError && (
              <WorkLoadError
                title="Couldn&apos;t load tasks"
                message={tasksErrorMessage}
                onRetry={() => refetchTasks()}
              />
            )}

            {user?.role === "admin" && activeTab === "tasks" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    aria-label="Search tasks and projects"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-work"
                  />
                </div>
              </div>
            )}

            {user?.role === "admin" && activeTab === "projects" && (
              <ProjectsTab ctx={ctx} />
            )}

            {(user?.role !== "admin" || activeTab === "tasks") && !tasksError && boardItemCount === 0 && (
              <WorkTasksEmptyState
                hasSearchQuery={searchQuery.trim().length > 0}
                onClearSearch={() => setSearchQuery("")}
                onOpenProjectsTab={() => setActiveTab("projects")}
              />
            )}

            {(user?.role !== "admin" || activeTab === "tasks") && !tasksError && boardItemCount > 0 && (
            <div className="space-y-2">
              {unifiedStatusConfig.map((status) => {
                const itemsInGroup = unifiedGroups[status.key] || [];
                const isEmpty = itemsInGroup.length === 0;
                const isCollapsed = collapsedGroups[status.key] ?? (itemsInGroup.length === 0);

                return (
                  <Card key={status.key} data-testid={`group-${status.key}`}>
                    <WorkStatusGroupHeader
                      statusKey={status.key}
                      label={status.label}
                      count={itemsInGroup.length}
                      isCollapsed={isCollapsed}
                      isEmpty={isEmpty}
                      onToggle={() => toggleGroup(status.key)}
                    />

                    {!isCollapsed && !isEmpty && (
                      <div
                        id={workStatusGroupPanelId(status.key)}
                        role="region"
                        aria-labelledby={`work-group-header-${status.key}`}
                        className="border-t"
                      >
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="min-w-[220px] text-xs font-medium text-muted-foreground">Name</TableHead>
                              <TableHead className="w-[60px] text-xs font-medium text-muted-foreground">Assignee</TableHead>
                              <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Start Date</TableHead>
                              <TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Due Date</TableHead>
                              <TableHead className="w-[130px] text-xs font-medium text-muted-foreground">Status</TableHead>
                              <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Priority</TableHead>
                              <TableHead className="w-[150px] hidden md:table-cell text-xs font-medium text-muted-foreground">Property</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemsInGroup.map((item, idx) => {
                              if (item.type === "task") {
                                const task = item.data as Task;
                                const childSubTasks = subTasksMap[task.id] || [];
                                if (childSubTasks.length > 0) {
                                  return (
                                    <ParentTaskRowGroup
                                      key={task.id}
                                      task={task}
                                      childSubTasks={childSubTasks}
                                      isExpanded={expandedParentTasks.has(task.id)}
                                      onToggleExpand={() => toggleParentTaskExpanded(task.id)}
                                      userGroups={userGroups}
                                      allUsers={allUsers}
                                      properties={properties}
                                      handleStatusChange={handleStatusChange}
                                      handleUrgencyChange={handleUrgencyChange}
                                      handleAssigneeChange={handleAssigneeChange}
                                      handlePropertyChange={handlePropertyChange}
                                      handleInlineEdit={handleInlineEdit}
                                      isAdmin={isAdmin}
                                      onReviewEstimates={(taskId) => setReviewEstimatesTaskId(taskId)}
                                      onSelectTask={handleSelectTask}
                                      selectedTaskId={selectedTaskId}
                                    />
                                  );
                                }
                                return (
                                  <TaskTableRow
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
                                    rowIndex={idx}
                                    isAdmin={isAdmin}
                                    onReviewEstimates={(taskId) => setReviewEstimatesTaskId(taskId)}
                                    onSelectTask={handleSelectTask}
                                    selectedTaskId={selectedTaskId}
                                  />
                                );
                              }

                              const project = item.data as Project;
                              const allChildTasks = allProjectTasksMap[project.id] || [];
                              const rootChildTasks = projectTasksMap[project.id] || [];
                              const completedChildTasks = allChildTasks.filter((t) => t.status === "completed").length;
                              const isExpanded = expandedProjects.has(project.id);

                              return (
                                <ProjectRowGroup
                                  key={project.id}
                                  project={project}
                                  childTasks={rootChildTasks}
                                  completedChildTasks={completedChildTasks}
                                  totalChildTaskCount={allChildTasks.length}
                                  isExpanded={isExpanded}
                                  onToggleExpand={() => toggleProjectExpanded(project.id)}
                                  subTasksMap={subTasksMap}
                                  expandedParentTasks={expandedParentTasks}
                                  onToggleParentTaskExpanded={toggleParentTaskExpanded}
                                  userGroups={userGroups}
                                  allUsers={allUsers}
                                  properties={properties}
                                  handleStatusChange={handleStatusChange}
                                  handleUrgencyChange={handleUrgencyChange}
                                  handleAssigneeChange={handleAssigneeChange}
                                  handlePropertyChange={handlePropertyChange}
                                  handleInlineEdit={handleInlineEdit}
                                  getPropertyName={getPropertyName}
                                  handleProjectStatusChange={handleProjectStatusChange}
                                  isAdmin={isAdmin}
                                  onReviewEstimates={(taskId) => setReviewEstimatesTaskId(taskId)}
                                  onSelectTask={handleSelectTask}
                                  selectedTaskId={selectedTaskId}
                                />
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {panelMounted && (
          <div
            className="shrink-0 overflow-hidden border-l"
            style={{
              width: isPanelFullscreen ? "100%" : panelVisible ? "400px" : "0px",
              borderColor: "#EEEEEE",
              transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            data-testid="task-detail-slide-panel"
          >
            <div style={{ width: isPanelFullscreen ? "100%" : "400px", height: "100%" }}>
              <TaskDetailPanel
                taskId={selectedTaskId!}
                isFullscreen={isPanelFullscreen}
                onClose={closeTaskPanel}
                onToggleFullscreen={() => setIsPanelFullscreen((prev) => !prev)}
                onViewCompletionReport={() => setSummaryTaskId(selectedTaskId!)}
                allUsers={allUsers}
                properties={properties}
              />
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={isHoldReasonDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeHoldReasonDialog();
          else setIsHoldReasonDialogOpen(true);
        }}
      >
        <DialogContent data-testid="dialog-hold-reason">
          <DialogHeader>
            <DialogTitle>Hold Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for putting this task on hold. This reason will be sent to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter reason for holding the task..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={4}
              data-testid="textarea-hold-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeHoldReasonDialog}
              data-testid="button-cancel-hold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleHoldReasonSubmit}
              disabled={!holdReason.trim() || updateTaskStatusMutation.isPending}
              data-testid="button-submit-hold"
            >
              {updateTaskStatusMutation.isPending ? "Holding..." : "Hold Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        properties={properties}
      />

      {reviewEstimatesTaskId && (
        <EstimateReviewDialog
          taskId={reviewEstimatesTaskId}
          open={!!reviewEstimatesTaskId}
          onOpenChange={(open) => {
            if (!open) setReviewEstimatesTaskId(null);
          }}
        />
      )}

      <CompletedTaskSummary
        taskId={summaryTaskId!}
        open={!!summaryTaskId}
        onOpenChange={(open) => !open && setSummaryTaskId(null)}
      />
    </>
  );
}
