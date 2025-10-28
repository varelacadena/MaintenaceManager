import { useState } from "react";
import DataTable from "@/components/DataTable";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download } from "lucide-react";

//todo: remove mock functionality
const mockTableData = [
  {
    id: "1001",
    title: "Fix leaking faucet in Building A",
    category: "Plumbing",
    status: "in_progress",
    urgency: "high" as const,
    assignedTo: { name: "John Smith", initials: "JS" },
    date: "Oct 30, 2025",
  },
  {
    id: "1002",
    title: "Replace broken light fixtures",
    category: "Electrical",
    status: "pending",
    urgency: "medium" as const,
    assignedTo: { name: "Sarah Davis", initials: "SD" },
    date: "Nov 2, 2025",
  },
  {
    id: "1003",
    title: "HVAC system maintenance",
    category: "HVAC",
    status: "completed",
    urgency: "low" as const,
    assignedTo: { name: "Mike Johnson", initials: "MJ" },
    date: "Oct 25, 2025",
  },
  {
    id: "1004",
    title: "Repair damaged flooring",
    category: "Renovation",
    status: "on_hold",
    urgency: "high" as const,
    assignedTo: { name: "Lisa Brown", initials: "LB" },
    date: "Oct 29, 2025",
  },
  {
    id: "1005",
    title: "Clean gutters on Building C",
    category: "Grounds & Landscaping",
    status: "pending",
    urgency: "low" as const,
    date: "Nov 10, 2025",
  },
];

const mockTaskDetail = {
  id: "1001",
  title: "Fix leaking faucet in Building A, Room 204",
  category: "Plumbing",
  urgency: "high" as const,
  status: "in_progress",
  description: "Water is continuously dripping from the main faucet in the science lab.",
  assignedTo: "John Smith",
  dueDate: "Oct 30, 2025",
};

export default function Requests() {
  const [selectedTask, setSelectedTask] = useState<typeof mockTaskDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">All Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and track all maintenance requests</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-requests"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <DataTable
        data={mockTableData}
        onViewRow={(id) => setSelectedTask(mockTaskDetail)}
      />

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
