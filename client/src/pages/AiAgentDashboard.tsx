import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Bot,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  TrendingUp,
  List,
  Settings,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
} from "lucide-react";

type AiAgentLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reasoning: string | null;
  proposedValue: any;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  promptTokens: number | null;
  completionTokens: number | null;
  modelUsed: string | null;
};

type AiStats = {
  pending: number;
  approved: number;
  rejected: number;
  autoApplied: number;
  total: number;
  acceptanceRate: number;
};

const ACTION_LABELS: Record<string, string> = {
  triage: "Triage",
  schedule: "Schedule",
  assign: "Assign",
  suggest_date: "Date Suggestion",
  pm_trigger: "PM Trigger",
  fleet_maintenance: "Fleet Maintenance",
  dependency_check: "Dependency Check",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "Pending Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  auto_applied: { label: "Auto-Applied", variant: "outline" },
};

const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o-mini": { prompt: 0.00000015, completion: 0.0000006 },
  "gpt-4o":      { prompt: 0.0000025,  completion: 0.00001 },
};

function calcCost(log: AiAgentLog): number | null {
  if (log.promptTokens == null || log.completionTokens == null || !log.modelUsed) return null;
  const pricing = MODEL_PRICING[log.modelUsed];
  if (!pricing) return null;
  return log.promptTokens * pricing.prompt + log.completionTokens * pricing.completion;
}

function formatCost(cost: number | null): string {
  if (cost === null) return "—";
  if (cost === 0) return "$0.0000";
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function calcTotalCost(logs: AiAgentLog[]): number {
  return logs.reduce((sum, log) => sum + (calcCost(log) ?? 0), 0);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AiAgentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<AiStats>({
    queryKey: ["/api/ai-stats"],
  });

  const { data: pendingLogs = [], isLoading: pendingLoading } = useQuery<AiAgentLog[]>({
    queryKey: ["/api/ai-logs", { status: "pending_review" }],
    queryFn: () => apiRequest("GET", "/api/ai-logs?status=pending_review").then((r) => r.json()),
  });

  const { data: allLogs = [], isLoading: allLoading } = useQuery<AiAgentLog[]>({
    queryKey: ["/api/ai-logs"],
    queryFn: () => apiRequest("GET", "/api/ai-logs").then((r) => r.json()),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      apiRequest("PATCH", `/api/ai-logs/${id}`, { status }).then((r) => r.json()),
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "approved" ? "Action approved and applied" : "Action rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to update AI log", variant: "destructive" }),
  });

  const filteredLogs = filterAction === "all"
    ? allLogs
    : allLogs.filter((l) => l.action === filterAction);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Agent</h1>
          <p className="text-sm text-muted-foreground">Oversight dashboard for automated decisions</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="stat-ai-pending">
              {statsLoading ? "—" : stats?.pending ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="stat-ai-approved">
              {statsLoading ? "—" : stats?.approved ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="stat-ai-rejected">
              {statsLoading ? "—" : stats?.rejected ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Auto-Applied</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="stat-ai-auto">
              {statsLoading ? "—" : stats?.autoApplied ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Accept Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="stat-ai-rate">
              {statsLoading ? "—" : `${stats?.acceptanceRate ?? 0}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Total AI Cost</span>
            </div>
            <p className="text-2xl font-bold mt-1" data-testid="stat-ai-cost">
              {allLoading ? "—" : formatCost(calcTotalCost(allLogs))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Review
            {(stats?.pending ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2">{stats?.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity Log</TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-config">Configuration</TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading pending actions...</div>
          )}
          {!pendingLoading && pendingLogs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
                <p className="font-medium">All caught up</p>
                <p className="text-sm mt-1">No AI actions pending review</p>
              </CardContent>
            </Card>
          )}
          {pendingLogs.map((log) => (
            <AiLogCard
              key={log.id}
              log={log}
              expanded={expandedLogId === log.id}
              onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
              onApprove={() => reviewMutation.mutate({ id: log.id, status: "approved" })}
              onReject={() => reviewMutation.mutate({ id: log.id, status: "rejected" })}
              isPending={reviewMutation.isPending}
            />
          ))}
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-3 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-48" data-testid="select-filter-action">
                <SelectValue placeholder="All action types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All action types</SelectItem>
                <SelectItem value="triage">Triage</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="assign">Assign</SelectItem>
                <SelectItem value="pm_trigger">PM Trigger</SelectItem>
                <SelectItem value="fleet_maintenance">Fleet Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {allLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
          )}
          {!allLoading && filteredLogs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <List className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No activity logged yet</p>
              </CardContent>
            </Card>
          )}
          {filteredLogs.map((log) => (
            <AiLogCard
              key={log.id}
              log={log}
              expanded={expandedLogId === log.id}
              onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
              onApprove={log.status === "pending_review" ? () => reviewMutation.mutate({ id: log.id, status: "approved" }) : undefined}
              onReject={log.status === "pending_review" ? () => reviewMutation.mutate({ id: log.id, status: "rejected" }) : undefined}
              isPending={reviewMutation.isPending}
            />
          ))}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-4">
          <AiConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AiLogCard({
  log,
  expanded,
  onToggle,
  onApprove,
  onReject,
  isPending,
}: {
  log: AiAgentLog;
  expanded: boolean;
  onToggle: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isPending: boolean;
}) {
  const statusInfo = STATUS_BADGE[log.status] || { label: log.status, variant: "outline" as const };

  return (
    <Card data-testid={`card-ai-log-${log.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{ACTION_LABELS[log.action] || log.action}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{log.entityType.replace("_", " ")}</Badge>
              <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {log.reasoning || "No reasoning provided"}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
              {log.modelUsed && (
                <span className="text-xs text-muted-foreground" data-testid={`text-cost-${log.id}`}>
                  {log.modelUsed} &middot; {formatCost(calcCost(log))}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggle}
              data-testid={`button-expand-log-${log.id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {onApprove && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onApprove}
                disabled={isPending}
                className="text-green-600"
                data-testid={`button-approve-log-${log.id}`}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
            )}
            {onReject && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onReject}
                disabled={isPending}
                className="text-red-600"
                data-testid={`button-reject-log-${log.id}`}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {expanded && log.proposedValue && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Proposed Action Details</p>
            <ProposedValueView action={log.action} value={log.proposedValue} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProposedValueView({ action, value }: { action: string; value: any }) {
  if (action === "triage") {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Suggested Urgency: </span>
          <span className="font-medium capitalize">{value.suggestedUrgency}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Category: </span>
          <span className="font-medium capitalize">{value.suggestedCategory}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Executor Type: </span>
          <span className="font-medium capitalize">{value.suggestedExecutorType}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Required Skill: </span>
          <span className="font-medium capitalize">{value.suggestedSkill}</span>
        </div>
        {value.draftTaskTitle && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Draft Task Title: </span>
            <span className="font-medium">{value.draftTaskTitle}</span>
          </div>
        )}
        {value.estimatedHours && (
          <div>
            <span className="text-muted-foreground">Est. Hours: </span>
            <span className="font-medium">{value.estimatedHours}h</span>
          </div>
        )}
      </div>
    );
  }

  if (action === "schedule") {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Assignee: </span>
          <span className="font-medium">{value.suggestedAssigneeName || value.assigneeName || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Start Date: </span>
          <span className="font-medium">{value.suggestedStartDate || value.startDate || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Due Date: </span>
          <span className="font-medium">{value.suggestedDueDate || value.dueDate || "—"}</span>
        </div>
      </div>
    );
  }

  if (action === "assign" && value.recommendations) {
    return (
      <div className="space-y-2">
        {value.recommendations.map((rec: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
            <span className="font-bold text-muted-foreground">#{rec.rank}</span>
            <span className="font-medium">{rec.studentName}</span>
            <span className="text-muted-foreground text-xs flex-1">{rec.reasoning}</span>
          </div>
        ))}
      </div>
    );
  }

  if (action === "pm_trigger" || action === "fleet_maintenance") {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}: </span>
            <span className="font-medium">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-40">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function AiConfigPanel() {
  const { toast } = useToast();
  const [autoTriage, setAutoTriage] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [autoPm, setAutoPm] = useState(true);

  const { data: slaConfigs = [], isLoading: slaLoading } = useQuery<any[]>({
    queryKey: ["/api/sla-configs"],
  });

  const queryClient = useQueryClient();

  const updateSlaMutation = useMutation({
    mutationFn: ({ urgencyLevel, responseHours, resolutionHours }: any) =>
      apiRequest("PUT", `/api/sla-configs/${urgencyLevel}`, { responseHours, resolutionHours }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "SLA configuration updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/sla-configs"] });
    },
    onError: () => toast({ title: "Failed to update SLA config", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Autonomy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <Label className="text-sm font-medium">Auto-apply triage suggestions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically update urgency and category from AI triage
              </p>
            </div>
            <Switch
              checked={autoTriage}
              onCheckedChange={setAutoTriage}
              data-testid="switch-auto-triage"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <Label className="text-sm font-medium">Auto-apply schedule suggestions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically assign tasks based on AI scheduling
              </p>
            </div>
            <Switch
              checked={autoSchedule}
              onCheckedChange={setAutoSchedule}
              data-testid="switch-auto-schedule"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <Label className="text-sm font-medium">Auto-apply PM triggers</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically create maintenance tasks from PM triggers
              </p>
            </div>
            <Switch
              checked={autoPm}
              onCheckedChange={setAutoPm}
              data-testid="switch-auto-pm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SLA Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {slaLoading ? (
            <p className="text-sm text-muted-foreground">Loading SLA configs...</p>
          ) : (
            <div className="space-y-4">
              {slaConfigs.map((config: any) => (
                <SlaConfigRow
                  key={config.urgencyLevel}
                  config={config}
                  onSave={(responseHours, resolutionHours) =>
                    updateSlaMutation.mutate({ urgencyLevel: config.urgencyLevel, responseHours, resolutionHours })
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SlaConfigRow({ config, onSave }: { config: any; onSave: (r: number, res: number) => void }) {
  const [responseHours, setResponseHours] = useState(String(config.responseHours));
  const [resolutionHours, setResolutionHours] = useState(String(config.resolutionHours));

  const urgencyColor = config.urgencyLevel === "high" ? "text-red-500" : config.urgencyLevel === "medium" ? "text-yellow-500" : "text-green-500";

  return (
    <div className="flex flex-wrap items-center gap-4 py-2 border-b last:border-0">
      <span className={`font-medium capitalize w-16 ${urgencyColor}`}>{config.urgencyLevel}</span>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Response (hrs):</Label>
        <input
          type="number"
          value={responseHours}
          onChange={(e) => setResponseHours(e.target.value)}
          className="w-16 border rounded px-2 py-1 text-sm bg-background"
          data-testid={`input-sla-response-${config.urgencyLevel}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Resolution (hrs):</Label>
        <input
          type="number"
          value={resolutionHours}
          onChange={(e) => setResolutionHours(e.target.value)}
          className="w-16 border rounded px-2 py-1 text-sm bg-background"
          data-testid={`input-sla-resolution-${config.urgencyLevel}`}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSave(Number(responseHours), Number(resolutionHours))}
        data-testid={`button-save-sla-${config.urgencyLevel}`}
      >
        Save
      </Button>
    </div>
  );
}
