import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest, Message, User } from "@shared/schema";

export default function Messages() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: requests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", selectedRequestId],
    enabled: !!selectedRequestId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/messages/request/${requestId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/request", selectedRequestId],
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when viewing a request
  useEffect(() => {
    if (selectedRequestId && messages.length > 0) {
      const hasUnreadMessages = messages.some(
        (msg) => !msg.read && msg.senderId !== user?.id
      );
      if (hasUnreadMessages) {
        markAsReadMutation.mutate(selectedRequestId);
      }
    }
  }, [selectedRequestId, messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", {
        requestId: selectedRequestId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/request", selectedRequestId],
      });
      setNewMessage("");
      scrollToBottom();
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("DELETE", `/api/messages/${messageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/request", selectedRequestId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages"],
      });
      toast({ title: "Message deleted" });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete message",
        variant: "destructive"
      });
    },
  });

  const requestsWithMessages = requests.filter(
    (req) =>
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.includes(searchQuery)
  );

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Communicate about maintenance requests
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <Card className="overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-messages"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {requestsWithMessages.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No requests found
              </div>
            ) : (
              requestsWithMessages.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  className={`p-4 border-b cursor-pointer hover-elevate ${
                    selectedRequestId === request.id ? "bg-muted" : ""
                  }`}
                  data-testid={`request-${request.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {request.title.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {(() => {
                        const requestMessages = allMessages.filter(
                          (msg) => msg.requestId === request.id
                        );
                        const unreadCount = requestMessages.filter(
                          (msg) => !msg.read && msg.senderId !== user?.id
                        ).length;
                        return unreadCount > 0 ? (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {request.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-xs no-default-hover-elevate"
                        >
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Request #{request.id.substring(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {request.category}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedRequest ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedRequest.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      Request #{selectedRequest.id.substring(0, 8)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/requests/${selectedRequest.id}`)}
                    data-testid="button-view-request"
                  >
                    View Request
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === user?.id;
                    const sender = users.find(u => u.id === message.senderId);

                    let senderName = "Unknown User";
                    if (isOwn) {
                      senderName = "You";
                    } else if (sender) {
                      // This block handles known senders.
                      // If the user is staff and the sender is admin or maintenance,
                      // it should display "Support Team". Otherwise, it displays the sender's name.
                      // The original logic intended to show "Support Team" here,
                      // but the user request is to show "Maintenance Team" for unknown users.
                      // So, we will prioritize the "Maintenance Team" logic for unknown users.
                      const fullName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
                      senderName = fullName || sender.username;
                    } else {
                      // This block handles unknown senders.
                      // If the user is staff and the sender is unknown,
                      // it should display "Maintenance Team".
                      // Otherwise, it displays "Unknown User".
                      senderName = user?.role === "staff" ? "Maintenance Team" : "Unknown User";
                    }


                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${isOwn ? "items-end" : "items-start"} group`}
                        data-testid={`message-${message.id}`}
                      >
                        <span className="text-xs font-medium text-muted-foreground mb-1">
                          {senderName}
                        </span>
                        <div className={`flex items-start gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? "bg-[#1E90FF] text-white rounded-tr-sm"
                                : "bg-gray-200 text-gray-900 rounded-tl-sm"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          {user?.role === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this message?")) {
                                  deleteMessageMutation.mutate(message.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {message.createdAt &&
                            new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="textarea-new-message"
                  />
                  <Button
                    onClick={() => sendMessageMutation.mutate(newMessage)}
                    disabled={
                      !newMessage.trim() || sendMessageMutation.isPending
                    }
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a request to view messages
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}