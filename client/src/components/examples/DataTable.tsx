import DataTable from '../DataTable';

const mockData = [
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
];

export default function DataTableExample() {
  return (
    <div className="p-6">
      <DataTable data={mockData} onViewRow={(id) => console.log('View row:', id)} />
    </div>
  );
}
