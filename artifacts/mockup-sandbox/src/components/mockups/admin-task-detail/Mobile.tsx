import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Flag,
  MapPin,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Building2,
  MessageSquare,
  Wrench,
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
  messages: 3,
  parts: 2,
  resources: { docs: 1, imgs: 2 },
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

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #F3F4F6" }}>
      <button
        className="flex items-center justify-between w-full px-4 py-3"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
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
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #EEEEEE" }}
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
            <DropdownMenuItem className="text-red-600">Delete Task</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title + Status area */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: status.dot }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ backgroundColor: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <Flag className="w-3 h-3" style={{ color: urgency.color }} />
              <span className="text-xs font-medium" style={{ color: urgency.color }}>
                {urgency.label}
              </span>
            </div>
          </div>
          <h1 className="text-base font-semibold leading-snug" style={{ color: "#1A1A1A" }}>
            {task.name}
          </h1>
        </div>

        {/* Key info — compact meta rows */}
        <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-3">
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Assigned to</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#1A1A1A" }}>
              {task.assignedTo}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Location</span>
            <span className="text-xs font-medium ml-auto text-right" style={{ color: "#1A1A1A" }}>
              {task.location} — {task.subLocation}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Due date</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#EF4444" }}>
              {task.dueDate}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Created</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#1A1A1A" }}>
              {task.createdDate}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: "#9CA3AF" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>Requested by</span>
            <span className="text-xs font-medium ml-auto" style={{ color: "#1A1A1A" }}>
              {task.requestedBy}
            </span>
          </div>
        </div>

        {/* Description */}
        <Section title="Description">
          <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
            {task.description}
          </p>
        </Section>

        {/* Subtasks — read-only */}
        <Section title={`Subtasks (${completedCount}/${task.subtasks.length})`}>
          <div className="mb-3">
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 4, backgroundColor: "#EEEEEE" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${progress}%`, backgroundColor: "#4338CA" }}
              />
            </div>
          </div>
          <div className="space-y-1">
            {task.subtasks.map((sub, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-1">
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
        </Section>

        {/* Quick counts row */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded" style={{ backgroundColor: "#F3F4F6" }}>
            <MessageSquare className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            <span className="text-xs font-medium" style={{ color: "#374151" }}>
              {task.messages} messages
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded" style={{ backgroundColor: "#F3F4F6" }}>
            <Wrench className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            <span className="text-xs font-medium" style={{ color: "#374151" }}>
              {task.parts} parts
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded" style={{ backgroundColor: "#F3F4F6" }}>
            <FileText className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            <span className="text-xs font-medium" style={{ color: "#374151" }}>
              {task.resources.docs + task.resources.imgs} files
            </span>
          </div>
        </div>

        {/* Time Log */}
        <Section title="Time Log" defaultOpen={false}>
          <div className="space-y-2">
            {task.timeEntries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: "#1A1A1A" }}>
                    {entry.user}
                  </span>
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>
                    {entry.date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: "#F3F4F6", color: "#374151" }}
                  >
                    {entry.duration}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <Pencil className="w-3 h-3" style={{ color: "#9CA3AF" }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Resources */}
        <Section title="Resources" defaultOpen={false}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 py-1.5 px-1 rounded">
              <FileText className="w-4 h-4" style={{ color: "#7C3AED" }} />
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#EDE9FE", color: "#7C3AED", backgroundColor: "#EDE9FE" }}>
                PDF
              </Badge>
              <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                HVAC_Filter_Manual.pdf
              </span>
            </div>
            <div className="flex items-center gap-2 py-1.5 px-1 rounded">
              <ImageIcon className="w-4 h-4" style={{ color: "#6B7280" }} />
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#F3F4F6", color: "#6B7280", backgroundColor: "#F3F4F6" }}>
                IMG
              </Badge>
              <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                filter_before.jpg
              </span>
            </div>
            <div className="flex items-center gap-2 py-1.5 px-1 rounded">
              <ImageIcon className="w-4 h-4" style={{ color: "#6B7280" }} />
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#F3F4F6", color: "#6B7280", backgroundColor: "#F3F4F6" }}>
                IMG
              </Badge>
              <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                unit_photo_204.jpg
              </span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
