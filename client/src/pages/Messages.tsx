import { useState } from "react";
import MessageThread from "@/components/MessageThread";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

//todo: remove mock functionality
const mockConversations = [
  {
    id: "1",
    requestId: "1001",
    title: "Leaking faucet - Building A",
    lastMessage: "I'll check it out this afternoon",
    timestamp: "2 hours ago",
    unread: 2,
    participant: { name: "John Smith", initials: "JS", role: "Maintenance Staff" },
  },
  {
    id: "2",
    requestId: "1002",
    title: "Light fixtures - Library",
    lastMessage: "Parts have been ordered",
    timestamp: "1 day ago",
    unread: 0,
    participant: { name: "Sarah Davis", initials: "SD", role: "Maintenance Staff" },
  },
  {
    id: "3",
    requestId: "1003",
    title: "HVAC maintenance check",
    lastMessage: "Scheduled for next week",
    timestamp: "3 days ago",
    unread: 1,
    participant: { name: "Mike Johnson", initials: "MJ", role: "Maintenance Staff" },
  },
];

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
    sender: { name: "John Smith", initials: "JS", role: "Maintenance Staff" },
    content: "I'll check it out this afternoon. Should have it fixed by end of day.",
    timestamp: "Oct 28, 11:15 AM",
    isOwn: true,
  },
  {
    id: "3",
    sender: { name: "Sarah Johnson", initials: "SJ", role: "College Staff" },
    content: "Thank you! Students are complaining about cold showers.",
    timestamp: "Oct 28, 11:20 AM",
    isOwn: false,
  },
];

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Communicate about maintenance requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <Card className="overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-messages"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b cursor-pointer hover-elevate ${
                  selectedConversation.id === conversation.id ? 'bg-muted' : ''
                }`}
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage />
                    <AvatarFallback>{conversation.participant.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{conversation.title}</h3>
                      {conversation.unread > 0 && (
                        <Badge variant="default" className="rounded-full px-2">
                          {conversation.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {conversation.participant.name} • #{conversation.requestId}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{conversation.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <div className="h-full">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage />
                  <AvatarFallback>{selectedConversation.participant.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedConversation.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.participant.name} • Request #{selectedConversation.requestId}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-80px)]">
              <MessageThread
                messages={mockMessages}
                onSendMessage={(msg) => console.log('Sent message:', msg)}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
