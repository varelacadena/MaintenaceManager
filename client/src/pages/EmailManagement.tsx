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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, FileText, Settings, Search, Save, CheckCircle, XCircle, MinusCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { EmailTemplate, EmailLog, NotificationSetting } from "@shared/schema";

type TabType = "templates" | "settings" | "logs";

const TRIGGERS = [
  { value: "new_service_request", label: "New Service Request Submitted", description: "When a staff member submits a new maintenance request" },
  { value: "new_vehicle_reservation", label: "New Vehicle Reservation Submitted", description: "When someone requests a vehicle reservation" },
  { value: "vehicle_reservation_approved", label: "Vehicle Reservation Approved", description: "When an admin approves a vehicle reservation" },
  { value: "vehicle_reservation_denied", label: "Vehicle Reservation Denied", description: "When an admin denies a vehicle reservation" },
  { value: "task_created", label: "Task Created", description: "When a new maintenance task is created" },
  { value: "task_assigned", label: "Task Assigned", description: "When a task is assigned to a user" },
  { value: "status_change", label: "Service Request Status Changed", description: "When a service request status is updated" },
  { value: "task_reminder", label: "Task Reminder (Scheduled)", description: "Scheduled reminder for tasks due within 7 days" },
  { value: "document_expiration", label: "Document Expiration Warning (Scheduled)", description: "Scheduled warning when a vehicle document is expiring" },
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

function TemplatesTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
      setEditingId(null);
      toast({ title: "Template updated", description: "Email template has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" });
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
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    },
  });

  const startEditing = (template: EmailTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditSubject(template.subject);
    setEditBody(template.body);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const triggerLabel = (trigger: string | null | undefined) => {
    if (!trigger) return null;
    return TRIGGERS.find(t => t.value === trigger)?.label || trigger;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const builtIn = templates?.filter(t => !t.isCustom) || [];
  const custom = templates?.filter(t => t.isCustom) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Edit templates or create new ones. Use <span className="font-mono text-xs bg-muted px-1 rounded">{"{{variables}}"}</span> to insert dynamic content. All templates are plain text.
        </p>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-template">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {custom.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Templates</h2>
          {custom.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isEditing={editingId === template.id}
              editName={editName}
              editSubject={editSubject}
              editBody={editBody}
              onEditName={setEditName}
              onEditSubject={setEditSubject}
              onEditBody={setEditBody}
              onStartEdit={startEditing}
              onSave={() => updateMutation.mutate({ id: template.id, name: editName, subject: editSubject, body: editBody })}
              onCancel={cancelEditing}
              onDelete={() => deleteMutation.mutate(template.id)}
              isSaving={updateMutation.isPending}
              triggerLabel={triggerLabel(template.trigger)}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Built-in Templates</h2>
        {builtIn.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isEditing={editingId === template.id}
            editName={editName}
            editSubject={editSubject}
            editBody={editBody}
            onEditName={setEditName}
            onEditSubject={setEditSubject}
            onEditBody={setEditBody}
            onStartEdit={startEditing}
            onSave={() => updateMutation.mutate({ id: template.id, name: editName, subject: editSubject, body: editBody })}
            onCancel={cancelEditing}
            onDelete={null}
            isSaving={updateMutation.isPending}
            triggerLabel={triggerLabel(template.trigger)}
          />
        ))}
        {builtIn.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No built-in templates found.
            </CardContent>
          </Card>
        )}
      </div>

      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}

interface TemplateCardProps {
  template: EmailTemplate;
  isEditing: boolean;
  editName: string;
  editSubject: string;
  editBody: string;
  onEditName: (v: string) => void;
  onEditSubject: (v: string) => void;
  onEditBody: (v: string) => void;
  onStartEdit: (t: EmailTemplate) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (() => void) | null;
  isSaving: boolean;
  triggerLabel: string | null;
}

function TemplateCard({
  template, isEditing, editName, editSubject, editBody,
  onEditName, onEditSubject, onEditBody,
  onStartEdit, onSave, onCancel, onDelete, isSaving, triggerLabel,
}: TemplateCardProps) {
  const variables = template.availableVariables || (template.trigger ? TRIGGER_VARIABLES[template.trigger] : []) || [];

  return (
    <Card data-testid={`card-template-${template.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              className="font-semibold text-base h-auto py-0.5 px-2"
              data-testid={`input-template-name-${template.id}`}
            />
          ) : (
            <CardTitle className="text-base">{template.name}</CardTitle>
          )}
          <div className="flex gap-1 flex-wrap">
            {triggerLabel && (
              <Badge variant="secondary" className="text-xs">{triggerLabel}</Badge>
            )}
            {template.isCustom && (
              <Badge variant="outline" className="text-xs">Custom</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartEdit(template)}
                data-testid={`button-edit-template-${template.id}`}
              >
                Edit
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onDelete}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Subject</Label>
              <Input
                value={editSubject}
                onChange={(e) => onEditSubject(e.target.value)}
                className="mt-1 font-mono text-sm"
                data-testid={`input-template-subject-${template.id}`}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Body (plain text)</Label>
              <Textarea
                value={editBody}
                onChange={(e) => onEditBody(e.target.value)}
                rows={10}
                className="mt-1 font-mono text-sm"
                data-testid={`input-template-body-${template.id}`}
              />
            </div>
            {variables.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Available variables:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {variables.map((v) => (
                    <Badge key={v} variant="outline" className="font-mono text-xs">{v}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                data-testid={`button-save-template-${template.id}`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel} data-testid={`button-cancel-template-${template.id}`}>
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
              <p className="text-sm font-mono bg-muted/50 rounded-md px-3 py-2 mt-0.5 whitespace-pre-wrap line-clamp-6" data-testid={`text-template-body-${template.id}`}>
                {template.body}
              </p>
            </div>
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {variables.map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-xs">{v}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const variables = trigger ? (TRIGGER_VARIABLES[trigger] || []) : [];
  const selectedTrigger = TRIGGERS.find(t => t.value === trigger);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email-templates", { name, trigger, subject, body });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template created", description: "New email template has been added." });
      setName(""); setTrigger(""); setSubject(""); setBody("");
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    },
  });

  const handleClose = () => {
    setName(""); setTrigger(""); setSubject(""); setBody("");
    onClose();
  };

  const isValid = name.trim() && trigger && subject.trim() && body.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Email Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium">Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Reservation Denial Notice"
              className="mt-1"
              data-testid="input-create-name"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Trigger</Label>
            <p className="text-xs text-muted-foreground mb-1">The system event that will send this email</p>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger data-testid="select-create-trigger">
                <SelectValue placeholder="Select a trigger..." />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTrigger && (
              <p className="text-xs text-muted-foreground mt-1">{selectedTrigger.description}</p>
            )}
          </div>

          {variables.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Available variables for this trigger:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {variables.map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-xs">{v}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Your reservation for {{vehicle_name}} was not approved"
              className="mt-1 font-mono text-sm"
              data-testid="input-create-subject"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Body (plain text)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Dear {{requester_name}},\n\nYour reservation for {{vehicle_name}} has been reviewed...\n\nRegards,\nFacilities Team"}
              rows={10}
              className="mt-1 font-mono text-sm"
              data-testid="input-create-body"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
            data-testid="button-create-template-submit"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                      <Badge variant="outline" className="text-xs">{TRIGGERS.find(t => t.value === log.templateType)?.label || log.templateType}</Badge>
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
