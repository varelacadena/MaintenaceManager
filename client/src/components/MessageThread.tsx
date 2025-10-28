import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface Message {
  id: string;
  sender: {
    name: string;
    avatar?: string;
    initials: string;
    role: string;
  };
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

interface MessageThreadProps {
  messages: Message[];
  onSendMessage?: (content: string) => void;
}

export default function MessageThread({ messages, onSendMessage }: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage);
      setNewMessage("");
      console.log('Message sent:', newMessage);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.isOwn ? 'flex-row-reverse' : ''}`}
            data-testid={`message-${message.id}`}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={message.sender.avatar} />
              <AvatarFallback className="text-xs">{message.sender.initials}</AvatarFallback>
            </Avatar>
            <div className={`flex-1 max-w-md ${message.isOwn ? 'items-end' : ''}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium">{message.sender.name}</span>
                <span className="text-xs text-muted-foreground">{message.sender.role}</span>
              </div>
              <Card className={`p-3 ${message.isOwn ? 'bg-primary/10' : ''}`}>
                <p className="text-sm">{message.content}</p>
              </Card>
              <span className="text-xs text-muted-foreground mt-1 block">{message.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="resize-none min-h-[80px]"
            data-testid="input-message"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} size="icon" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
