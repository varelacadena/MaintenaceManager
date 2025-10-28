import { useState } from 'react';
import TaskDetailPanel from '../TaskDetailPanel';
import { Button } from '@/components/ui/button';

const mockTask = {
  id: "1001",
  title: "Fix leaking faucet in Building A, Room 204",
  category: "Plumbing",
  urgency: "high" as const,
  status: "in_progress",
  description: "Water is continuously dripping from the main faucet in the science lab. This is causing water waste and needs immediate attention.",
  assignedTo: "John Smith",
  dueDate: "Oct 30, 2025",
};

export default function TaskDetailPanelExample() {
  const [showPanel, setShowPanel] = useState(true);

  return (
    <div className="relative h-screen">
      <div className="p-6">
        <Button onClick={() => setShowPanel(true)}>Show Task Detail Panel</Button>
      </div>
      {showPanel && (
        <TaskDetailPanel task={mockTask} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}
