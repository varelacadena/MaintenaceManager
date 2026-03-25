import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  kpis,
  weeklyTrend,
  technicians,
  projects,
  aiRecommendations,
  recentRequests,
  vehicleReservations,
  taskBoard
} from "./_shared/data";
import { 
  ClipboardList, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  TrendingUp,
  BrainCircuit,
  Car,
  Wrench,
  Check,
  Zap,
  MoreVertical,
  Activity,
  AlertCircle
} from "lucide-react";

function RadialProgress({ completed, total, strokeColor }: { completed: number; total: number; strokeColor: string }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-10 h-10 shrink-0">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="3" className="stroke-muted" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold tabular-nums">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// Map priority to color for tasks
const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-emerald-500",
};

// Map status to color for requests
const statusColors: Record<string, string> = {
  pending: "bg-amber-500",
  under_review: "bg-blue-500",
  converted_to_task: "bg-emerald-500",
  rejected: "bg-red-500",
};

export function SectionedDashboard() {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Operations Overview</h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Export Report</Button>
            <Button size="sm">New Task</Button>
          </div>
        </div>

        {/* FULL-WIDTH KPI BANNER */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-card to-card/50 shadow-sm border-muted-foreground/20">
            <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Open Tasks</p>
                  <p className="text-3xl font-bold">{kpis.openTasks}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-end gap-1 h-8">
                {weeklyTrend.map((day, i) => (
                  <div key={i} className="flex-1 bg-primary/20 rounded-t-sm relative group" style={{ height: `${(day.tasks / 30) * 100}%` }}>
                    <div className="absolute hidden group-hover:block -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                      {day.tasks}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6 flex items-center justify-between h-full">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-3xl font-bold text-amber-600">{kpis.highPriority}</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6 flex items-center justify-between h-full">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{kpis.overdue}</p>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6 flex items-center justify-between h-full">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-3xl font-bold text-blue-600">{kpis.dueToday}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6 flex items-center justify-between h-full">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-3xl font-bold text-emerald-600">{kpis.completedToday}</p>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* THREE-COLUMN BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: ~30% (3/12 on lg) */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-6">
            {/* Technician Daily Progress */}
            <Card className="h-[400px] flex flex-col shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Technician Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pr-2">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {technicians.map((tech) => (
                      <div key={tech.name} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-muted text-xs font-medium">{tech.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tech.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{tech.completed} / {tech.total} tasks</p>
                        </div>
                        <RadialProgress completed={tech.completed} total={tech.total} strokeColor={tech.strokeColor} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Project Status */}
            <Card className="h-[300px] flex flex-col shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Project Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-5">
                  {projects.map((project) => (
                    <div key={project.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium truncate pr-2">{project.name}</span>
                        <span className="text-muted-foreground tabular-nums">${(project.budget / 1000).toFixed(1)}k</span>
                      </div>
                      <Progress value={project.progress} className="h-2 bg-muted" />
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="capitalize">{project.status.replace("_", " ")}</span>
                        <span>{project.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CENTER COLUMN: ~40% (5/12 on lg) */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
            {/* Task Board - Kanban style */}
            <Card className="flex-1 flex flex-col border-2 border-primary/5 shadow-md">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Task Board</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="grid grid-cols-4 h-[676px]">
                  {/* To Do */}
                  <div className="border-r p-3 space-y-3 bg-muted/10 overflow-y-auto">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To Do</h4>
                      <Badge variant="secondary" className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center text-xs rounded-full">
                        {taskBoard.todo.length}
                      </Badge>
                    </div>
                    {taskBoard.todo.map(task => (
                      <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-2" style={{ borderTopColor: `var(--${task.priority === 'critical' ? 'destructive' : task.priority === 'high' ? 'amber-500' : task.priority === 'medium' ? 'blue-500' : 'emerald-500'})` }}>
                        <div className="flex items-start gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${priorityColors[task.priority]}`} />
                          <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">{task.priority}</span>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* In Progress */}
                  <div className="border-r p-3 space-y-3 bg-blue-50/30 dark:bg-blue-900/5 overflow-y-auto">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">In Progress</h4>
                      <Badge variant="outline" className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center text-xs rounded-full text-blue-600 border-blue-200 bg-blue-50">
                        {taskBoard.inProgress.length}
                      </Badge>
                    </div>
                    {taskBoard.inProgress.map(task => (
                      <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${priorityColors[task.priority]}`} />
                          <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                          <Avatar className="w-4 h-4"><AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">{task.assignee.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Done */}
                  <div className="border-r p-3 space-y-3 bg-emerald-50/30 dark:bg-emerald-900/5 overflow-y-auto">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Done</h4>
                      <Badge variant="outline" className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center text-xs rounded-full text-emerald-600 border-emerald-200 bg-emerald-50">
                        {taskBoard.completed.length}
                      </Badge>
                    </div>
                    {taskBoard.completed.map(task => (
                      <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer opacity-75 hover:opacity-100">
                        <div className="flex items-start gap-2 mb-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <p className="text-sm font-medium leading-tight line-clamp-2 line-through text-muted-foreground">{task.title}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Blocked */}
                  <div className="p-3 space-y-3 bg-red-50/30 dark:bg-red-900/5 overflow-y-auto">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Blocked</h4>
                      <Badge variant="outline" className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center text-xs rounded-full text-red-600 border-red-200 bg-red-50">
                        {taskBoard.blocked.length}
                      </Badge>
                    </div>
                    {taskBoard.blocked.map(task => (
                      <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-red-200 dark:border-red-900/50">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                          <p className="text-sm font-medium leading-tight line-clamp-2 text-red-700 dark:text-red-400">{task.title}</p>
                        </div>
                        {task.reason && (
                          <div className="bg-red-100/50 dark:bg-red-900/20 p-1.5 rounded mt-2 mb-2">
                            <p className="text-[10px] text-red-600 dark:text-red-400 leading-tight">{task.reason}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-100 dark:border-red-900/30">
                          <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: ~30% (3/12 on lg) */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-6">
            {/* AI Recommendations */}
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base flex items-center gap-2 text-primary">
                  <BrainCircuit className="w-5 h-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 mb-2">
                  <div className="bg-background rounded-md p-2 flex-1 text-center border shadow-sm">
                    <p className="text-xl font-bold text-primary">{aiRecommendations.pending}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Pending</p>
                  </div>
                  <div className="bg-background rounded-md p-2 flex-1 text-center border shadow-sm">
                    <p className="text-xl font-bold text-emerald-600">{aiRecommendations.acceptanceRate}%</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Accepted</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {aiRecommendations.suggestions.map((suggestion, i) => (
                    <div key={i} className="bg-background border rounded-lg p-3 shadow-sm text-sm group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                      <div className="pl-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-muted-foreground capitalize">{suggestion.type}</span>
                        </div>
                        <p className="leading-tight pr-8">{suggestion.text}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Service Requests */}
            <Card className="flex flex-col shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  Recent Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentRequests.map((req) => (
                    <div key={req.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusColors[req.status]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{req.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{req.date}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] font-medium text-muted-foreground capitalize">{req.status.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="w-full mt-4 text-xs h-8 text-primary">View All Requests</Button>
              </CardContent>
            </Card>

            {/* Vehicle Activity */}
            <Card className="flex flex-col shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  Fleet Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                    <span className="text-lg font-semibold text-blue-600">{vehicleReservations.checkoutsToday}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Out</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                    <span className="text-lg font-semibold text-emerald-600">{vehicleReservations.checkinsToday}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">In</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Upcoming</h4>
                  {vehicleReservations.upcoming.map((up, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${up.type === 'checkout' ? 'text-blue-600 border-blue-200' : 'text-emerald-600 border-emerald-200'}`}>
                          {up.type === 'checkout' ? 'OUT' : 'IN'}
                        </Badge>
                        <span className="font-medium truncate max-w-[100px] text-xs">{up.vehicle.split(" ")[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{up.user}</span>
                        <span>{up.time}</span>
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
