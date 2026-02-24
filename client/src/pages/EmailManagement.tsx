import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, FileText, Settings, Search, Save, CheckCircle, XCircle, MinusCircle, Loader2 } from "lucide-react";
import type { EmailTemplate, EmailLog, NotificationSetting } from "@shared/schema";

type TabType = "templates" | "settings" | "logs";

export default function EmailManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("templates");

  const tabs: { id: TabType; label: string; icon: typeof Mail }[] = [
    { id: "templates", label: "Templates", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "logs", label: "Email Logs", icon: Mail },
  ];

  return (
    <div className="space-y-6" data-testid="page-email-management">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Email Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage email templates, notification toggles, and view email history</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`button-tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "settings" && <SettingsTab />}
      {activeTab === "logs" && <LogsTab />}
    </div>
  );
}

function TemplatesTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, subject, body }: { id: string; subject: string; body: string }) => {
      const res = await apiRequest("PATCH", `/api/email-templates/${id}`, { subject, body });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setEditingId(null);
      toast({ title: "Template updated", description: "Email template has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" });
    },
  });

  const startEditing = (template: EmailTemplate) => {
    setEditingId(template.id);
    setEditSubject(template.subject);
    setEditBody(template.body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditSubject("");
    setEditBody("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit the subject and body of each email template. Use the listed variables (in double curly braces) to insert dynamic content. Templates are plain text only.
      </p>
      {templates?.map((template) => (
        <Card key={template.id} data-testid={`card-template-${template.id}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge variant="secondary" className="mt-1">{template.type}</Badge>
            </div>
            {editingId !== template.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => startEditing(template)}
                data-testid={`button-edit-template-${template.id}`}
              >
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingId === template.id ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="mt-1 font-mono text-sm"
                    data-testid={`input-template-subject-${template.id}`}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Body (plain text)</Label>
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
                    className="mt-1 font-mono text-sm"
                    data-testid={`input-template-body-${template.id}`}
                  />
                </div>
                {template.availableVariables && template.availableVariables.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Available variables:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.availableVariables.map((v) => (
                        <Badge key={v} variant="outline" className="font-mono text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: template.id, subject: editSubject, body: editBody })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-save-template-${template.id}`}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEditing} data-testid={`button-cancel-template-${template.id}`}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Subject:</span>
                  <p className="text-sm font-mono bg-muted/50 rounded-md px-3 py-2 mt-0.5 whitespace-pre-wrap" data-testid={`text-template-subject-${template.id}`}>
                    {template.subject}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Body:</span>
                  <p className="text-sm font-mono bg-muted/50 rounded-md px-3 py-2 mt-0.5 whitespace-pre-wrap" data-testid={`text-template-body-${template.id}`}>
                    {template.body}
                  </p>
                </div>
                {template.availableVariables && template.availableVariables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.availableVariables.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {(!templates || templates.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No email templates found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<NotificationSetting[]>({
    queryKey: ["/api/notification-settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, emailEnabled, inAppEnabled }: { id: string; emailEnabled?: boolean; inAppEnabled?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/notification-settings/${id}`, { emailEnabled, inAppEnabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Setting updated", description: "Notification setting has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Control which notification types send emails or create in-app notifications. Disabling email will skip sending but still log the action.
      </p>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr,auto,auto] gap-4 items-center pb-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Notification Type</span>
              <span className="text-sm font-medium text-muted-foreground text-center w-20">Email</span>
              <span className="text-sm font-medium text-muted-foreground text-center w-20">In-App</span>
            </div>
            {settings?.map((setting) => (
              <div key={setting.id} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center" data-testid={`row-setting-${setting.id}`}>
                <div>
                  <span className="text-sm font-medium" data-testid={`text-setting-label-${setting.id}`}>{setting.label}</span>
                  <Badge variant="outline" className="ml-2 font-mono text-xs">{setting.type}</Badge>
                </div>
                <div className="flex justify-center w-20">
                  <Switch
                    checked={setting.emailEnabled}
                    onCheckedChange={(checked) => updateMutation.mutate({ id: setting.id, emailEnabled: checked })}
                    data-testid={`switch-email-${setting.id}`}
                  />
                </div>
                <div className="flex justify-center w-20">
                  <Switch
                    checked={setting.inAppEnabled}
                    onCheckedChange={(checked) => updateMutation.mutate({ id: setting.id, inAppEnabled: checked })}
                    data-testid={`switch-inapp-${setting.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const queryParams = new URLSearchParams();
  if (filterType && filterType !== "all") queryParams.set("templateType", filterType);
  if (filterStatus && filterStatus !== "all") queryParams.set("status", filterStatus);
  if (searchTerm) queryParams.set("search", searchTerm);

  const { data: logs, isLoading } = useQuery<EmailLog[]>({
    queryKey: ["/api/email-logs", filterType, filterStatus, searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/email-logs?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const templateTypes = [
    "new_service_request",
    "new_vehicle_reservation",
    "vehicle_reservation_approved",
    "task_created",
    "task_assigned",
    "status_change",
    "task_reminder",
    "document_expiration",
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "skipped": return <MinusCircle className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-logs"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {templateTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !logs || logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No email logs found. Emails will appear here as they are sent.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} data-testid={`card-log-${log.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusIcon(log.status)}
                      <span className="text-sm font-medium truncate" data-testid={`text-log-subject-${log.id}`}>{log.subject}</span>
                      <Badge variant="outline" className="text-xs">{log.templateType.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      To: {log.recipientName ? `${log.recipientName} <${log.recipientEmail}>` : log.recipientEmail}
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-log-date-${log.id}`}>
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
