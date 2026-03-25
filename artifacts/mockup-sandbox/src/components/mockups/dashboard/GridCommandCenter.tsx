import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, BrainCircuit, Users, Truck, Clock, ClipboardList,
  Briefcase, LayoutKanban, ArrowUpRight, CheckCircle2, 
  AlertCircle, AlertTriangle, Zap, Check, ArrowRight
} from "lucide-react";
import {
  kpis, weeklyTrend, technicians, projects, 
  aiRecommendations, recentRequests, vehicleReservations, taskBoard
} from "./_shared/data";

function getPriorityColor(priority: string) {
  switch (priority) {
    case "critical": return "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400";
    case "high": return "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-900 dark:text-orange-400";
    case "medium": return "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400";
    case "low": return "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
    default: return "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending": return "bg-amber-500";
    case "under_review": return "bg-blue-500";
    case "converted_to_task": return "bg-emerald-500";
    default: return "bg-slate-500";
  }
}

export function GridCommandCenter() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const maxWeeklyTasks = Math.max(...weeklyTrend.map(t => t.tasks));

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Operations Overview</h1>
            <p className="text-muted-foreground mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Clock className="w-4 h-4 mr-2" />
              Real-time Sync Active
            </Button>
            <Button size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* CSS Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* === TOP ROW === */}
          
          {/* Work Order Overview (Span 8) */}
          <Card className="lg:col-span-8 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Work Order Overview
                  </CardTitle>
                  <CardDescription>Key performance indicators and volume trends</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8 mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                  <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <ClipboardList className="w-4 h-4" />
                      <span className="text-sm font-medium">Open Tasks</span>
                    </div>
                    <div className="text-3xl font-bold text-primary">{kpis.openTasks}</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">High Priority</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{kpis.highPriority}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Overdue</span>
                    </div>
                    <div className="text-3xl font-bold text-red-700 dark:text-red-300">{kpis.overdue}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Due Today</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{kpis.dueToday}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Completed Today</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{kpis.completedToday}</div>
                  </div>
                </div>
                
                {/* Mini Bar Chart */}
                <div className="w-full md:w-48 shrink-0 flex flex-col justify-end">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-4">WEEKLY VOLUME</h4>
                  <div className="flex items-end justify-between h-32 gap-1.5">
                    {weeklyTrend.map((day) => (
                      <div key={day.day} className="flex flex-col items-center gap-2 flex-1 group">
                        <div className="w-full relative flex-1 flex items-end">
                          <div 
                            className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary/40 transition-colors relative"
                            style={{ height: `${(day.tasks / maxWeeklyTasks) * 100}%` }}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                              {day.tasks}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">{day.day[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions (Span 4) */}
          <Card className="lg:col-span-4 shadow-sm border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <BrainCircuit className="w-5 h-5" />
                    AI Dispatch
                  </CardTitle>
                  <CardDescription>Intelligent scheduling optimization</CardDescription>
                </div>
                <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                  {aiRecommendations.pending} New
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1 text-center p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                  <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{aiRecommendations.approved}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approved</p>
                </div>
                <div className="flex-1 text-center p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                  <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{aiRecommendations.autoApplied}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-Applied</p>
                </div>
                <div className="flex-1 text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{aiRecommendations.acceptanceRate}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accepted</p>
                </div>
              </div>
              <div className="space-y-3">
                {aiRecommendations.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm hover:shadow transition-shadow">
                    <div className="mt-0.5 shrink-0 bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-full text-indigo-600 dark:text-indigo-400">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                        {suggestion.text}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500/70">
                          {suggestion.type}
                        </span>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50">
                            &times;
                          </Button>
                          <Button size="sm" className="h-6 px-2 text-xs rounded-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* === MIDDLE ROW === */}

          {/* Technician Progress (Span 4) */}
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                Field Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {technicians.map((tech) => (
                <div key={tech.name} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`${tech.color} text-white text-xs font-medium`}>
                      {tech.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium truncate pr-2">{tech.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {tech.completed}/{tech.total}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full ${tech.color} transition-all duration-500`} 
                        style={{ width: `${(tech.completed / tech.total) * 100}%` }}
                      />
                      {tech.inProgress > 0 && (
                        <div 
                          className={`h-full ${tech.color} opacity-40 transition-all duration-500`} 
                          style={{ width: `${(tech.inProgress / tech.total) * 100}%` }}
                        />
                      )}
                    </div>
                    {tech.currentTask && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        <span className="animate-pulse inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                        {tech.currentTask}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vehicle Reservations (Span 4) */}
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="w-5 h-5 text-primary" />
                Fleet Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/50">
                  <div className="text-2xl font-bold text-foreground">{vehicleReservations.totalActive}</div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase mt-1">Active</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{vehicleReservations.checkinsToday}</div>
                  <div className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80 uppercase mt-1">Check-ins</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-900/50">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{vehicleReservations.checkoutsToday}</div>
                  <div className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 uppercase mt-1">Check-outs</div>
                </div>
              </div>
              
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">UPCOMING MOVEMENT</h4>
              <div className="space-y-3">
                {vehicleReservations.upcoming.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${res.type === 'checkout' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'}`}>
                        {res.type === 'checkout' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5 rotate-90" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{res.vehicle}</p>
                        <p className="text-xs text-muted-foreground">{res.user}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium shadow-sm">
                      {res.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Service Requests (Span 4) */}
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-5 h-5 text-primary" />
                Recent Requests
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {recentRequests.map((req, i) => (
                  <div key={req.id} className={`py-3 ${i !== recentRequests.length - 1 ? 'border-b border-border/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${getStatusColor(req.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{req.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">{req.date}</span>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <span className={`text-[10px] font-medium uppercase tracking-wider ${req.priority === 'high' ? 'text-orange-500' : req.priority === 'medium' ? 'text-blue-500' : 'text-slate-500'}`}>
                            {req.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* === BOTTOM ROW === */}

          {/* Projects (Span 4) */}
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="w-5 h-5 text-primary" />
                Capital Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {projects.map((project) => (
                <div key={project.name} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-medium leading-none">{project.name}</span>
                      <p className="text-xs text-muted-foreground mt-1">Budget: ${project.budget.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase ${project.priority === 'critical' ? 'border-red-200 text-red-600' : ''}`}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={project.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium tabular-nums w-8 text-right">{project.progress}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Kanban Board (Span 8) */}
          <Card className="lg:col-span-8 shadow-sm flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutKanban className="w-5 h-5 text-primary" />
                Active Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[700px] h-full">
                
                {/* To Do Column */}
                <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Do</h4>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{taskBoard.todo.length}</Badge>
                  </div>
                  <div className="space-y-2 flex-1">
                    {taskBoard.todo.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="flex-1 flex flex-col bg-blue-50/30 dark:bg-blue-950/10 rounded-xl p-3 border border-blue-100/50 dark:border-blue-900/30">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Progress</h4>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] h-5 px-1.5 hover:bg-blue-200">{taskBoard.inProgress.length}</Badge>
                  </div>
                  <div className="space-y-2 flex-1">
                    {taskBoard.inProgress.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>

                {/* Blocked Column */}
                <div className="flex-1 flex flex-col bg-red-50/30 dark:bg-red-950/10 rounded-xl p-3 border border-red-100/50 dark:border-red-900/30">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Blocked</h4>
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px] h-5 px-1.5 hover:bg-red-200">{taskBoard.blocked.length}</Badge>
                  </div>
                  <div className="space-y-2 flex-1">
                    {taskBoard.blocked.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>

                {/* Completed Column */}
                <div className="flex-1 flex flex-col bg-emerald-50/30 dark:bg-emerald-950/10 rounded-xl p-3 border border-emerald-100/50 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Done</h4>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[10px] h-5 px-1.5 hover:bg-emerald-200">{taskBoard.completed.length}</Badge>
                  </div>
                  <div className="space-y-2 flex-1">
                    {taskBoard.completed.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

interface BoardTask {
  id: number;
  title: string;
  priority: string;
  assignee: string;
  reason?: string;
}

function TaskCard({ task }: { task: BoardTask }) {
  return (
    <div className="bg-background p-3 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group">
      <div className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">{task.title}</div>
      {task.reason && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded inline-block">
          {task.reason}
        </div>
      )}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </Badge>
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] border border-border">
            {task.assignee === 'Unassigned' ? '?' : task.assignee.split(' ').map((n:string)=>n[0]).join('')}
          </div>
          {task.assignee}
        </span>
      </div>
    </div>
  );
}
