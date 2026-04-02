import {
  ArrowLeft,
  Pencil,
  Flag,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Building2,
  MessageSquare,
  Wrench,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const task = {
  name: "Replace HVAC filter unit — Building A, Room 204",
  status: "in_progress",
  urgency: "high",
  description:
    "The HVAC filter in Room 204 has exceeded its service life and is causing poor air circulation. Replacement parts have been ordered. The technician should shut down the unit before replacing the filter and run a 15-minute test cycle after installation.",
  assignedTo: "Carlos Martinez",
  location: "Engineering Building A",
  subLocation: "Room 204",
  dueDate: "Apr 5, 2026",
  createdDate: "Mar 28, 2026",
  requestedBy: "Prof. Sarah Chen",
  subtasks: [
    { name: "Shut down HVAC unit", completed: true },
    { name: "Remove old filter", completed: true },
    { name: "Install new filter", completed: false },
    { name: "Run 15-min test cycle", completed: false },
  ],
  timeEntries: [
    { user: "Carlos M.", date: "Mar 30", duration: "45 min" },
    { user: "Carlos M.", date: "Mar 31", duration: "1h 20min" },
  ],
  messages: [
    { user: "Prof. Sarah Chen", text: "The air quality has been terrible this week. Students are complaining.", time: "Mar 28, 10:15 AM" },
    { user: "Carlos Martinez", text: "Inspected the unit. Filter is completely clogged. Ordering replacement now.", time: "Mar 29, 2:30 PM" },
    { user: "Admin", text: "Parts approved and ordered. Expected delivery Mar 31.", time: "Mar 29, 4:00 PM" },
  ],
  parts: [
    { name: "HVAC Filter 20x25x4 MERV-13", qty: 1, status: "Installed" },
    { name: "Filter gasket seal", qty: 2, status: "In stock" },
  ],
  resources: [
    { name: "HVAC_Filter_Manual.pdf", type: "PDF" },
    { name: "filter_before.jpg", type: "IMG" },
    { name: "unit_photo_204.jpg", type: "IMG" },
  ],
};

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  not_started: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", label: "Not Started" },
  in_progress: { bg: "#EEF2FF", text: "#4338CA", dot: "#4338CA", label: "In Progress" },
  completed: { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A", label: "Completed" },
  on_hold: { bg: "#FFF7ED", text: "#EA580C", dot: "#EA580C", label: "On Hold" },
};

const urgencyConfig: Record<string, { color: string; label: string }> = {
  low: { color: "#22C55E", label: "Low" },
  medium: { color: "#F59E0B", label: "Medium" },
  high: { color: "#EF4444", label: "High" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
      {children}
    </p>
  );
}

export function Mobile() {
  const status = statusConfig[task.status];
  const urgency = urgencyConfig[task.urgency];
  const completedCount = task.subtasks.filter((s) => s.completed).length;
  const progress = (completedCount / task.subtasks.length) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFFFFF", maxWidth: 390 }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0 sticky top-0 z-10"
        style={{ borderBottom: "1px solid #EEEEEE", backgroundColor: "#FFFFFF" }}
      >
        <Button size="icon" variant="ghost">
          <ArrowLeft className="w-4 h-4" style={{ color: "#1A1A1A" }} />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="gap-1.5" style={{ borderColor: "#E5E7EB" }}>
          <Pencil className="w-3 h-3" />
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="w-4 h-4" style={{ color: "#6B7280" }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-red-600 gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable content — everything visible */}
      <div className="flex-1 overflow-y-auto">
        {/* Title + Status */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.dot }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ backgroundColor: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <Flag className="w-3 h-3" style={{ color: urgency.color }} />
              <span className="text-xs font-medium" style={{ color: urgency.color }}>{urgency.label}</span>
            </div>
          </div>
          <h1 className="text-base font-semibold leading-snug" style={{ color: "#1A1A1A" }}>
            {task.name}
          </h1>
        </div>

        {/* Meta info */}
        <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-3">
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Assigned to</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#1A1A1A" }}>{task.assignedTo}</span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Location</span>
            <span className="text-xs font-medium ml-auto text-right" style={{ color: "#1A1A1A" }}>{task.location} — {task.subLocation}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Due date</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#EF4444" }}>{task.dueDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Created</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#1A1A1A" }}>{task.createdDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Requested by</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#1A1A1A" }}>{task.requestedBy}</span>
          </div>
        </div>

        {/* Description — always visible */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <SectionLabel>Description</SectionLabel>
          <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
            {task.description}
          </p>
        </div>

        {/* Subtasks — always visible, read-only */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Subtasks</SectionLabel>
            <span className="text-xs font-medium" style={{ color: "#4338CA" }}>
              {completedCount}/{task.subtasks.length}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden mb-3" style={{ height: 4, backgroundColor: "#EEEEEE" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: "#4338CA" }} />
          </div>
          <div className="space-y-1">
            {task.subtasks.map((sub, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-1">
                <span
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: sub.completed ? "#4338CA" : "#D1D5DB",
                    backgroundColor: sub.completed ? "#4338CA" : "transparent",
                  }}
                >
                  {sub.completed && <CheckCircle2 className="w-2.5 h-2.5" style={{ color: "#FFF" }} />}
                </span>
                <span
                  className={`text-sm ${sub.completed ? "line-through" : ""}`}
                  style={{ color: sub.completed ? "#9CA3AF" : "#1A1A1A" }}
                >
                  {sub.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages — always visible */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <SectionLabel>Messages ({task.messages.length})</SectionLabel>
          <div className="space-y-3">
            {task.messages.map((msg, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{msg.user}</span>
                  <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{msg.time}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>{msg.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Parts — always visible */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <SectionLabel>Parts ({task.parts.length})</SectionLabel>
          <div className="space-y-2">
            {task.parts.map((part, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                  <span className="text-xs" style={{ color: "#1A1A1A" }}>{part.name}</span>
                  <span className="text-[10px]" style={{ color: "#9CA3AF" }}>x{part.qty}</span>
                </div>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>
                  {part.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Time Log — always visible */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Time Log</SectionLabel>
            <span className="text-xs font-medium" style={{ color: "#6B7280" }}>Total: 2h 5min</span>
          </div>
          <div className="space-y-2">
            {task.timeEntries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>{entry.user}</span>
                  <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{entry.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "#F3F4F6", color: "#374151" }}>
                    {entry.duration}
                  </span>
                  <Button size="icon" variant="ghost">
                    <Pencil className="w-3 h-3" style={{ color: "#9CA3AF" }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resources — always visible */}
        <div className="px-4 py-3">
          <SectionLabel>Resources ({task.resources.length})</SectionLabel>
          <div className="space-y-1.5">
            {task.resources.map((res, i) => {
              const isImg = res.type === "IMG";
              return (
                <div key={i} className="flex items-center gap-2 py-1.5 px-1 rounded">
                  {isImg ? (
                    <ImageIcon className="w-4 h-4" style={{ color: "#6B7280" }} />
                  ) : (
                    <FileText className="w-4 h-4" style={{ color: "#7C3AED" }} />
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      borderColor: isImg ? "#F3F4F6" : "#EDE9FE",
                      color: isImg ? "#6B7280" : "#7C3AED",
                      backgroundColor: isImg ? "#F3F4F6" : "#EDE9FE",
                    }}
                  >
                    {res.type}
                  </Badge>
                  <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>{res.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
