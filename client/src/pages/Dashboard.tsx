import { useState } from "react";
import StatCard from "@/components/StatCard";
import TaskCard from "@/components/TaskCard";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Clock, CheckCircle, AlertCircle, Search, Plus } from "lucide-react";

//todo: remove mock functionality
const mockStats = [
  { icon: ClipboardList, label: "Active Requests", value: 23, trend: "+12% from last week", trendUp: true },
  { icon: Clock, label: "In Progress", value: 15, trend: "+5% from last week", trendUp: true },
  { icon: AlertCircle, label: "High Priority", value: 8, trend: "-3% from last week", trendUp: false },
  { icon: CheckCircle, label: "Completed Today", value: 12, trend: "+20% from yesterday", trendUp: true },
];

const mockTasks = [
  {
    id: "1001",
    title: "Fix leaking faucet in Building A, Room 204",
    category: "Plumbing",
    urgency: "high" as const,
    status: "in_progress" as const,
    assignedTo: { name: "John Smith", initials: "JS" },
    dueDate: "Oct 30, 2025",
  },
  {
    id: "1002",
    title: "Replace broken light fixtures in Library",
    category: "Electrical",
    urgency: "medium" as const,
    status: "pending" as const,
    assignedTo: { name: "Sarah Davis", initials: "SD" },
    dueDate: "Nov 2, 2025",
  },
  {
    id: "1003",
    title: "HVAC system maintenance check",
    category: "HVAC",
    urgency: "low" as const,
    status: "in_progress" as const,
    assignedTo: { name: "Mike Johnson", initials: "MJ" },
    dueDate: "Nov 5, 2025",
  },
  {
    id: "1004",
    title: "Repair damaged flooring in Cafeteria",
    category: "Renovation",
    urgency: "high" as const,
    status: "pending" as const,
    dueDate: "Oct 29, 2025",
  },
];

const mockTaskDetail = {
  id: "1001",
  title: "Fix leaking faucet in Building A, Room 204",
  category: "Plumbing",
  urgency: "high" as const,
  status: "in_progress",
  description: "Water is continuously dripping from the main faucet in the science lab. This is causing water waste and needs immediate attention. The leak appears to be coming from the valve assembly.",
  assignedTo: "John Smith",
  dueDate: "Oct 30, 2025",
};

export default function Dashboard() {
  const [selectedTask, setSelectedTask] = useState<typeof mockTaskDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of maintenance operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-semibold">Recent Requests</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Button data-testid="button-new-request">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockTasks.map((task) => (
            <TaskCard
              key={task.id}
              {...task}
              onView={() => setSelectedTask(mockTaskDetail)}
            />
          ))}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
