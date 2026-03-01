import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, FileText, Settings, Search, Save, CheckCircle, XCircle, MinusCircle, Loader2, Plus, Trash2, ArrowLeft, Eye, Pencil } from "lucide-react";
import type { EmailTemplate, EmailLog, NotificationSetting } from "@shared/schema";

type TabType = "templates" | "settings" | "logs";

const TRIGGERS = [
  { value: "new_service_request", label: "New Service Request", description: "When a staff member submits a new maintenance request" },
  { value: "new_vehicle_reservation", label: "New Vehicle Reservation", description: "When someone requests a vehicle reservation" },
  { value: "vehicle_reservation_approved", label: "Reservation Approved", description: "When an admin approves a vehicle reservation" },
  { value: "vehicle_reservation_denied", label: "Reservation Denied", description: "When an admin denies a vehicle reservation" },
  { value: "task_created", label: "Task Created", description: "When a new maintenance task is created" },
  { value: "task_assigned", label: "Task Assigned", description: "When a task is assigned to a user" },
  { value: "status_change", label: "Status Changed", description: "When a service request status is updated" },
  { value: "task_reminder", label: "Task Reminder", description: "Scheduled reminder for tasks due within 7 days" },
  { value: "document_expiration", label: "Document Expiration", description: "Scheduled warning when a vehicle document is expiring" },
];

const TRIGGER_VARIABLES: Record<string, string[]> = {
  new_service_request: ["{{requester_name}}", "{{request_title}}", "{{request_description}}", "{{urgency}}"],
  new_vehicle_reservation: ["{{requester_name}}", "{{vehicle_name}}", "{{purpose}}", "{{start_date}}", "{{end_date}}"],
  vehicle_reservation_approved: ["{{vehicle_name}}", "{{start_date}}", "{{end_date}}", "{{purpose}}"],
  vehicle_reservation_denied: ["{{vehicle_name}}", "{{start_date}}", "{{end_date}}", "{{requester_name}}"],
  task_created: ["{{requester_name}}", "{{request_title}}", "{{request_description}}", "{{urgency}}"],
  task_assigned: ["{{request_title}}", "{{request_description}}", "{{urgency}}"],
  status_change: ["{{request_title}}", "{{status_message}}", "{{old_status}}", "{{new_status}}"],
  task_reminder: ["{{task_name}}", "{{task_status}}", "{{due_date}}"],
  document_expiration: ["{{document_name}}", "{{vehicle_name}}", "{{expiration_date}}"],
};

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

type EditorMode = "edit" | "preview";
type PanelView = "list" | "editor";

function TemplatesTab() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [panelView, setPanelView] = useState<PanelView>("list");

  const [editName, setEditName] = useState("");
  const [editTrigger, setEditTrigger] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedField = useRef<"subject" | "body">("body");

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, subject, body }: { id: string; name: string; subject: string; body: string }) => {
      const res = await apiRequest("PATCH", `/api/email-templates/${id}`, { name, subject, body });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email-templates", {
        name: editName,
        trigger: editTrigger,
        subject: editSubject,
        body: editBody,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template created" });
      setIsCreating(false);
      setSelectedId(data.id);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/email-templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template deleted" });
      clearSelection();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    },
  });

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedId(template.id);
    setIsCreating(false);
    setEditName(template.name);
    setEditTrigger(template.trigger || "");
    setEditSubject(template.subject);
    setEditBody(template.body);
    setEditorMode("edit");
    setPanelView("editor");
  };

  const startCreating = () => {
    setSelectedId(null);
    setIsCreating(true);
    setEditName("");
    setEditTrigger("");
    setEditSubject("");
    setEditBody("");
    setEditorMode("edit");
    setPanelView("editor");
  };

  const clearSelection = () => {
    setSelectedId(null);
    setIsCreating(false);
    setPanelView("list");
  };

  const insertVariable = useCallback((variable: string) => {
    const field = lastFocusedField.current;
    if (field === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? editSubject.length;
      const end = el.selectionEnd ?? editSubject.length;
      const newVal = editSubject.slice(0, start) + variable + editSubject.slice(end);
      setEditSubject(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? editBody.length;
      const end = el.selectionEnd ?? editBody.length;
      const newVal = editBody.slice(0, start) + variable + editBody.slice(end);
      setEditBody(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  }, [editSubject, editBody]);

  const selectedTemplate = templates?.find(t => t.id === selectedId) ?? null;
  const variables = isCreating
    ? (editTrigger ? TRIGGER_VARIABLES[editTrigger] || [] : [])
    : (selectedTemplate?.availableVariables || (selectedTemplate?.trigger ? TRIGGER_VARIABLES[selectedTemplate.trigger] : []) || []);

  const builtIn = templates?.filter(t => !t.isCustom) || [];
  const custom = templates?.filter(t => t.isCustom) || [];

  const triggerLabel = (trigger: string | null | undefined) =>
    TRIGGERS.find(t => t.value === trigger)?.label ?? trigger ?? null;

  const handleSave = () => {
    if (isCreating) {
      createMutation.mutate();
    } else if (selectedId) {
      updateMutation.mutate({ id: selectedId, name: editName, subject: editSubject, body: editBody });
    }
  };

  const isSaving = updateMutation.isPending || createMutation.isPending;
  const canSave = editName.trim() && editSubject.trim() && editBody.trim() && (!isCreating || editTrigger);

  const renderPreview = () => {
    const renderWithBadges = (text: string) => {
      const parts = text.split(/({{[^}]+}})/g);
      return parts.map((part, i) => {
        if (/^{{[^}]+}}$/.test(part)) {
          const name = part.replace(/[{}]/g, "");
          return <Badge key={i} variant="secondary" className="font-mono text-xs mx-0.5">{name}</Badge>;
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      });
    };

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Subject</p>
          <div className="text-sm font-medium leading-relaxed">{renderWithBadges(editSubject || "—")}</div>
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Body</p>
          <div className="text-sm leading-relaxed">{renderWithBadges(editBody || "—")}</div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[500px]">
      <div
        className={`flex-col w-full md:w-64 md:flex md:flex-shrink-0 border-r pr-4 overflow-y-auto ${panelView === "list" ? "flex" : "hidden md:flex"}`}
        data-testid="panel-template-list"
      >
        <Button
          variant="outline"
          className="w-full mb-4"
          onClick={startCreating}
          data-testid="button-new-template"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>

        {custom.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1 px-1">Custom</p>
            <div className="space-y-0.5">
              {custom.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  data-testid={`button-select-template-${t.id}`}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${selectedId === t.id && !isCreating ? "bg-muted" : "hover-elevate"}`}
                >
                  <p className="text-sm font-medium leading-tight truncate">{t.name}</p>
                  {t.trigger && <p className="text-xs text-muted-foreground truncate mt-0.5">{triggerLabel(t.trigger)}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {custom.length > 0 && builtIn.length > 0 && <div className="h-px bg-border mb-3" />}

        {builtIn.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1 px-1">Built-in</p>
            <div className="space-y-0.5">
              {builtIn.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  data-testid={`button-select-template-${t.id}`}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${selectedId === t.id && !isCreating ? "bg-muted" : "hover-elevate"}`}
                >
                  <p className="text-sm font-medium leading-tight truncate">{t.name}</p>
                  {t.trigger && <p className="text-xs text-muted-foreground truncate mt-0.5">{triggerLabel(t.trigger)}</p>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className={`flex-col flex-1 min-w-0 ${panelView === "editor" ? "flex" : "hidden md:flex"}`}
        data-testid="panel-template-editor"
      >
        {!selectedId && !isCreating ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a template or create a new one
          </div>
        ) : (
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={clearSelection}
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Template name"
                className="flex-1 text-base font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-2"
                data-testid="input-template-name"
              />

              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditorMode("edit")}
                  className={editorMode === "edit" ? "bg-muted" : ""}
                  data-testid="button-mode-edit"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditorMode("preview")}
                  className={editorMode === "preview" ? "bg-muted" : ""}
                  data-testid="button-mode-preview"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>

              {selectedTemplate?.isCustom && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-template"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={!canSave || isSaving}
                data-testid="button-save-template"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>

            {isCreating && (
              <div>
                <Label className="text-xs text-muted-foreground">Trigger event</Label>
                <Select value={editTrigger} onValueChange={setEditTrigger}>
                  <SelectTrigger className="mt-1" data-testid="select-trigger">
                    <SelectValue placeholder="Select a trigger..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editorMode === "edit" ? (
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <Input
                    ref={subjectRef}
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    onFocus={() => { lastFocusedField.current = "subject"; }}
                    placeholder="Email subject line"
                    className="mt-1"
                    data-testid="input-template-subject"
                  />
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <Label className="text-xs text-muted-foreground mb-1">Body</Label>
                  <Textarea
                    ref={bodyRef}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    onFocus={() => { lastFocusedField.current = "body"; }}
                    placeholder={"Dear {{requester_name}},\n\n..."}
                    className="flex-1 resize-none font-mono text-sm min-h-[180px]"
                    data-testid="input-template-body"
                  />
                </div>

                {variables.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Click to insert variable</p>
                    <div className="flex flex-wrap gap-1">
                      {variables.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          data-testid={`button-insert-variable-${v}`}
                          className="inline-flex"
                        >
                          <Badge variant="outline" className="font-mono text-xs cursor-pointer hover-elevate">
                            {v}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto rounded-md border p-4 bg-muted/30">
                {renderPreview()}
              </div>
            )}
          </div>
        )}
      </div>
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
      toast({ title: "Setting updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
            {TRIGGERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
                      <Badge variant="outline" className="text-xs">{TRIGGERS.find(t => t.value === log.templateType)?.label || log.templateType}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      To: {log.recipientName ? `${log.recipientName} <${log.recipientEmail}>` : log.recipientEmail}
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{log.errorMessage}</p>
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
