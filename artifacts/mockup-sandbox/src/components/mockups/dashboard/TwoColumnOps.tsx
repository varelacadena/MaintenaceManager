import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  AlertCircle,
  AlertTriangle,
  UserX,
  CheckCircle2,
  Clock,
  Sparkles,
  Car,
  Users,
  Activity,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import {
  kpis,
  technicians,
  projects,
  aiRecommendations,
  recentRequests,
  vehicleReservations,
  taskBoard
} from "./_shared/data";

// Mini ProgressBar for Technicians
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const barColor = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500";

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-foreground tabular-nums w-10 text-right">
        {completed}/{total}
      </span>
    </div>
  );
}

export function TwoColumnOps() {
  const today = format(new Date(), "EEEE, MMMM do, yyyy");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      case "high": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "medium": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "low": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400";
      default: return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-500";
      case "under_review": return "bg-blue-500";
      case "converted_to_task": return "bg-emerald-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 xl:p-8">
      <div className="max-w-[1280px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Operations Overview</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{today}</span>
            </div>
          </div>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN - 60% (7 cols on lg) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.dueToday}</div>
                    <div className="text-xs text-muted-foreground font-medium">Due Today</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.overdue}</div>
                    <div className="text-xs text-muted-foreground font-medium">Overdue</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.highPriority}</div>
                    <div className="text-xs text-muted-foreground font-medium">High Priority</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                    <UserX className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.unassigned}</div>
                    <div className="text-xs text-muted-foreground font-medium">Unassigned</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.completedToday}</div>
                    <div className="text-xs text-muted-foreground font-medium">Completed</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task Overview (Kanban) */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Task Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
                  {/* To Do */}
                  <div className="p-4 bg-muted/20">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
                      TO DO <Badge variant="secondary" className="text-[10px] px-1">{taskBoard.todo.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {taskBoard.todo.map(task => (
                        <div key={task.id} className="bg-background border rounded-lg p-3 shadow-sm flex flex-col gap-2">
                          <span className="text-sm font-medium leading-tight">{task.title}</span>
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <Badge variant="outline" className={`text-[10px] uppercase px-1.5 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* In Progress */}
                  <div className="p-4 bg-muted/20">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
                      IN PROGRESS <Badge variant="secondary" className="text-[10px] px-1">{taskBoard.inProgress.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {taskBoard.inProgress.map(task => (
                        <div key={task.id} className="bg-background border-l-2 border-l-blue-500 border-t border-r border-b rounded-lg p-3 shadow-sm flex flex-col gap-2">
                          <span className="text-sm font-medium leading-tight">{task.title}</span>
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <Badge variant="outline" className={`text-[10px] uppercase px-1.5 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Done */}
                  <div className="p-4 bg-muted/20">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
                      DONE <Badge variant="secondary" className="text-[10px] px-1">{taskBoard.completed.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {taskBoard.completed.map(task => (
                        <div key={task.id} className="bg-background border rounded-lg p-3 shadow-sm opacity-60 flex flex-col gap-2">
                          <span className="text-sm font-medium leading-tight line-through">{task.title}</span>
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <Badge variant="outline" className={`text-[10px] uppercase px-1.5 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blocked */}
                  <div className="p-4 bg-red-50/30 dark:bg-red-950/10">
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center justify-between">
                      BLOCKED <Badge variant="destructive" className="text-[10px] px-1">{taskBoard.blocked.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {taskBoard.blocked.map(task => (
                        <div key={task.id} className="bg-background border-l-2 border-l-red-500 border-t border-r border-b rounded-lg p-3 shadow-sm flex flex-col gap-2">
                          <span className="text-sm font-medium leading-tight">{task.title}</span>
                          <p className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-1 rounded">Reason: {task.reason}</p>
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <Badge variant="outline" className={`text-[10px] uppercase px-1.5 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Status */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Project Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {projects.map((project, i) => (
                    <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-sm truncate">{project.name}</span>
                          <Badge variant="outline" className={`text-[10px] uppercase px-1.5 ${getPriorityColor(project.priority)}`}>
                            {project.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={project.progress} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-9 text-right">{project.progress}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1 text-sm">
                        <span className="font-medium">${project.budget.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground capitalize">{project.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
          
          {/* RIGHT COLUMN - 40% (5 cols on lg) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6">
            
            {/* Technician Daily Progress */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Technician Progress
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {technicians.reduce((acc, t) => acc + t.completed, 0)} / {technicians.reduce((acc, t) => acc + t.total, 0)} Done
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {technicians.map((tech) => (
                  <div key={tech.name} className="flex items-center gap-3 group">
                    <Avatar className="h-9 w-9 shrink-0 border">
                      <AvatarFallback className={`${tech.color} text-white text-xs font-medium`}>
                        {tech.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{tech.name}</span>
                        {tech.completed === tech.total ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0 bg-emerald-50 dark:bg-emerald-950/30">
                            Done
                          </Badge>
                        ) : tech.inProgress > 0 ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/30">
                            Active
                          </Badge>
                        ) : null}
                      </div>
                      <ProgressBar completed={tech.completed} total={tech.total} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-indigo-950/20 dark:via-background dark:to-purple-950/20 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    AI Insights
                  </CardTitle>
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {aiRecommendations.pending} Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 mb-1">
                  <div className="text-center p-2 bg-white/70 dark:bg-background/70 rounded-lg border border-indigo-50 dark:border-indigo-900/30">
                    <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{aiRecommendations.approved}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approved</p>
                  </div>
                  <div className="text-center p-2 bg-white/70 dark:bg-background/70 rounded-lg border border-indigo-50 dark:border-indigo-900/30">
                    <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{aiRecommendations.autoApplied}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-Applied</p>
                  </div>
                  <div className="text-center p-2 bg-white/70 dark:bg-background/70 rounded-lg border border-emerald-50 dark:border-emerald-900/30">
                    <p className="text-lg font-bold text-emerald-600">{aiRecommendations.acceptanceRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accepted</p>
                  </div>
                </div>
                {aiRecommendations.suggestions.map((sugg, i) => (
                  <div key={i} className="flex gap-3 bg-white/60 dark:bg-background/60 p-3 rounded-lg border border-indigo-50 dark:border-indigo-900/30 shadow-sm">
                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-indigo-950 dark:text-indigo-200 leading-snug">{sugg.text}</p>
                      <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 uppercase font-semibold mt-1 tracking-wider">{sugg.type}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Service Requests */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Recent Requests
                  </CardTitle>
                  <span className="text-xs text-muted-foreground cursor-pointer hover:underline">View All</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentRequests.map(req => (
                    <div key={req.id} className="p-3.5 hover:bg-muted/30 transition-colors flex items-start gap-3">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getStatusDot(req.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{req.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">{req.date}</span>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <span className="text-xs text-muted-foreground capitalize">{req.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] uppercase px-1.5 shrink-0 ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Activity */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  Fleet Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-muted/50 rounded-lg p-3 text-center border">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{vehicleReservations.checkoutsToday}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Checkouts Today</div>
                  </div>
                  <div className="flex-1 bg-muted/50 rounded-lg p-3 text-center border">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{vehicleReservations.checkinsToday}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Check-ins Today</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Schedule</h4>
                  {vehicleReservations.upcoming.map((res, i) => (
                    <div key={i} className="flex items-center justify-between bg-background border rounded p-2.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${res.type === 'checkout' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'}`}>
                          <Car className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{res.vehicle}</p>
                          <p className="text-xs text-muted-foreground">{res.user}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] mb-1 font-semibold">{res.time}</Badge>
                        <p className="text-[10px] text-muted-foreground capitalize">{res.type.replace('-', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
