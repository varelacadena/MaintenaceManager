import MessageThread from '../MessageThread';

const mockMessages = [
  {
    id: "1",
    sender: { name: "Sarah Johnson", initials: "SJ", role: "College Staff" },
    content: "The water heater in Building C needs immediate attention. It's not producing hot water.",
    timestamp: "Oct 28, 10:30 AM",
    isOwn: false,
  },
  {
    id: "2",
    sender: { name: "Mike Davis", initials: "MD", role: "Maintenance Staff" },
    content: "I'll check it out this afternoon. Should have it fixed by end of day.",
    timestamp: "Oct 28, 11:15 AM",
    isOwn: true,
  },
];

export default function MessageThreadExample() {
  return (
    <div className="h-96 p-6">
      <MessageThread
        messages={mockMessages}
        onSendMessage={(msg) => console.log('New message:', msg)}
      />
    </div>
  );
}
