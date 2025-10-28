import TaskCard from '../TaskCard';

export default function TaskCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
      <TaskCard
        id="1001"
        title="Fix leaking faucet in Building A, Room 204"
        category="Plumbing"
        urgency="high"
        status="in_progress"
        assignedTo={{ name: "John Smith", initials: "JS" }}
        dueDate="Oct 30, 2025"
        onView={() => console.log('View task 1001')}
      />
      <TaskCard
        id="1002"
        title="Replace broken light fixtures in Library"
        category="Electrical"
        urgency="medium"
        status="pending"
        dueDate="Nov 2, 2025"
        onView={() => console.log('View task 1002')}
      />
    </div>
  );
}
