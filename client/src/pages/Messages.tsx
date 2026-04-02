import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, Trash2, MessageCircle, FileText, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest, Message, User as UserType, Task } from "@shared/schema";
import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";

interface ConversationUser {
  user: UserType;
  lastMessage?: Message;
  unreadCount: number;
  relatedRequestIds: Set<string>;
  relatedTaskIds: Set<string>;
  conversationMessages: Message[];
}

function formatMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else if (isThisWeek(date)) {
    return format(date, "EEEE");
  } else if (isThisYear(date)) {
    return format(date, "MMM d");
  }
  return format(date, "MM/dd/yy");
}

function formatFullMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

function getInitials(user: UserType): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return (user.username?.substring(0, 2) ?? "?").toUpperCase();
}

function getDisplayName(user: UserType): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username;
}

function getAvatarColor(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Messages() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: requests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
  });

  const conversationUsers = useMemo((): ConversationUser[] => {
    if (!user || users.length === 0) return [];

    const userConversations = new Map<string, {
      requestIds: Set<string>;
      taskIds: Set<string>;
    }>();

    const getOrCreateConv = (userId: string) => {
      if (!userConversations.has(userId)) {
        userConversations.set(userId, { requestIds: new Set(), taskIds: new Set() });
      }
      return userConversations.get(userId)!;
    };

    const isAdminOrTechnician = user.role === 'admin' || user.role === 'technician';

    allMessages.forEach((msg) => {
      if (msg.requestId) {
        const request = requests.find(r => r.id === msg.requestId);
        if (!request) return;
        
        const isCurrentUserRequester = request.requesterId === user.id;
        const isCurrentUserSender = msg.senderId === user.id;
        const isMsgFromRequester = msg.senderId === request.requesterId;
        
        if (isCurrentUserRequester) {
          if (msg.senderId !== user.id) {
            const conv = getOrCreateConv(msg.senderId);
            conv.requestIds.add(msg.requestId);
          }
        } else if (isCurrentUserSender) {
          const conv = getOrCreateConv(request.requesterId);
          conv.requestIds.add(msg.requestId);
        } else if (isAdminOrTechnician && isMsgFromRequester) {
          const conv = getOrCreateConv(request.requesterId);
          conv.requestIds.add(msg.requestId);
        } else if (isAdminOrTechnician && !isMsgFromRequester) {
          const conv = getOrCreateConv(msg.senderId);
          conv.requestIds.add(msg.requestId);
        }
      }

      if (msg.taskId) {
        const task = tasks.find(t => t.id === msg.taskId);
        if (!task) return;
        
        const isCurrentUserAssigned = task.assignedToId === user.id;
        const isCurrentUserCreator = task.createdById === user.id;
        const isCurrentUserSender = msg.senderId === user.id;
        
        if (!isCurrentUserAssigned && !isCurrentUserCreator && !isCurrentUserSender) {
          return;
        }
        
        let otherUserId: string | null = null;
        
        if (isCurrentUserSender) {
          if (task.assignedToId && task.assignedToId !== user.id) {
            otherUserId = task.assignedToId;
          } else if (task.createdById && task.createdById !== user.id) {
            otherUserId = task.createdById;
          }
        } else {
          otherUserId = msg.senderId;
        }
        
        if (otherUserId && otherUserId !== user.id) {
          const conv = getOrCreateConv(otherUserId);
          conv.taskIds.add(msg.taskId);
        }
      }
    });

    const conversations: ConversationUser[] = [];

    userConversations.forEach((data, targetUserId) => {
      const targetUser = users.find(u => u.id === targetUserId);
      if (!targetUser) return;

      const conversationMessages = allMessages
        .filter(msg => {
          const isInSharedRequest = msg.requestId && data.requestIds.has(msg.requestId);
          const isInSharedTask = msg.taskId && data.taskIds.has(msg.taskId);
          
          if (!isInSharedRequest && !isInSharedTask) return false;
          
          return msg.senderId === user.id || msg.senderId === targetUserId;
        })
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      const unreadCount = conversationMessages.filter(
        msg => !msg.read && msg.senderId === targetUserId
      ).length;

      const lastMessage = conversationMessages.length > 0 
        ? conversationMessages[conversationMessages.length - 1] 
        : undefined;

      if (conversationMessages.length > 0 || data.requestIds.size > 0 || data.taskIds.size > 0) {
        conversations.push({
          user: targetUser,
          lastMessage,
          unreadCount,
          relatedRequestIds: data.requestIds,
          relatedTaskIds: data.taskIds,
          conversationMessages,
        });
      }
    });

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return conversations;
  }, [allMessages, users, user, requests, tasks]);

  const selectedConversation = conversationUsers.find(c => c.user.id === selectedUserId);

  const conversationMessages = useMemo(() => {
    return selectedConversation?.conversationMessages || [];
  }, [selectedConversation]);

  const contextOptions = useMemo(() => {
    if (!selectedConversation) return [];
    
    const options: { id: string; type: 'request' | 'task'; label: string }[] = [];
    
    selectedConversation.relatedRequestIds.forEach(reqId => {
      const req = requests.find(r => r.id === reqId);
      if (req) {
        options.push({ id: reqId, type: 'request', label: req.title });
      }
    });
    
    selectedConversation.relatedTaskIds.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        options.push({ id: taskId, type: 'task', label: task.name });
      }
    });
    
    return options;
  }, [selectedConversation, requests, tasks]);

  useEffect(() => {
    if (selectedConversation && contextOptions.length > 0) {
      const lastMsg = conversationMessages[conversationMessages.length - 1];
      if (lastMsg) {
        const contextId = lastMsg.requestId || lastMsg.taskId;
        if (contextId && contextOptions.some(o => o.id === contextId)) {
          setSelectedContextId(contextId);
          return;
        }
      }
      setSelectedContextId(contextOptions[0].id);
    } else {
      setSelectedContextId(null);
    }
  }, [selectedUserId, contextOptions.length]);

  const markAsReadMutation = useMutation({
    mutationFn: async ({ requestIds, taskIds }: { requestIds: string[], taskIds: string[] }) => {
      const promises = [
        ...requestIds.map(requestId => 
          apiRequest("POST", `/api/messages/request/${requestId}/mark-read`, {})
        ),
        ...taskIds.map(taskId => 
          apiRequest("POST", `/api/messages/task/${taskId}/mark-read`, {})
        ),
      ];
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark messages as read", variant: "destructive" });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      const requestIds = Array.from(selectedConversation.relatedRequestIds);
      const taskIds = Array.from(selectedConversation.relatedTaskIds);
      if (requestIds.length > 0 || taskIds.length > 0) {
        markAsReadMutation.mutate({ requestIds, taskIds });
      }
    }
  }, [selectedUserId, selectedConversation?.unreadCount]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedContextId) {
        throw new Error("Please select a request or task to reply to");
      }
      
      const contextOption = contextOptions.find(o => o.id === selectedContextId);
      if (!contextOption) {
        throw new Error("Invalid context selected");
      }
      
      return await apiRequest("POST", "/api/messages", {
        requestId: contextOption.type === 'request' ? selectedContextId : undefined,
        taskId: contextOption.type === 'task' ? selectedContextId : undefined,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
      scrollToBottom();
    },
    onError: (error) => {
      toast({
        title: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("DELETE", `/api/messages/${messageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message deleted" });
    },
    onError: () => {
      toast({
        title: "Failed to delete message",
        variant: "destructive",
      });
    },
  });

  const filteredConversations = conversationUsers.filter((conv) => {
    const name = getDisplayName(conv.user).toLowerCase();
    const email = (conv.user.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && selectedContextId) {
        sendMessageMutation.mutate(newMessage);
      }
    }
  };

  const getMessageContext = (msg: Message): { type: 'request' | 'task'; label: string; id: string } | null => {
    if (msg.requestId) {
      const request = requests.find(r => r.id === msg.requestId);
      return request ? { type: 'request', label: request.title, id: request.id } : null;
    }
    if (msg.taskId) {
      const task = tasks.find(t => t.id === msg.taskId);
      return task ? { type: 'task', label: task.name, id: task.id } : null;
    }
    return null;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Messages</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Your conversations with team members
        </p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row rounded-xl overflow-hidden border bg-card shadow-sm">
        <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r flex flex-col bg-muted/30 ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-card/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                data-testid="input-search-conversations"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {messagesLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-pulse">Loading conversations...</div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  Messages will appear here when you communicate about requests
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.user.id}
                    onClick={() => setSelectedUserId(conv.user.id)}
                    className={`p-4 cursor-pointer transition-colors hover-elevate ${
                      selectedUserId === conv.user.id
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : ""
                    }`}
                    data-testid={`conversation-${conv.user.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className={`w-12 h-12 ${getAvatarColor(conv.user.id)}`}>
                          <AvatarFallback className="text-white font-medium">
                            {getInitials(conv.user)}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3 className={`font-medium text-sm truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
                            {getDisplayName(conv.user)}
                          </h3>
                          {conv.lastMessage?.createdAt && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatMessageTime(new Date(conv.lastMessage.createdAt))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 no-default-hover-elevate">
                            {conv.user.role}
                          </Badge>
                        </div>
                        {conv.lastMessage && (
                          <p className={`text-xs mt-1 truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                            {conv.lastMessage.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                          {conv.relatedRequestIds.size > 0 && `${conv.relatedRequestIds.size} request${conv.relatedRequestIds.size > 1 ? "s" : ""}`}
                          {conv.relatedRequestIds.size > 0 && conv.relatedTaskIds.size > 0 && " • "}
                          {conv.relatedTaskIds.size > 0 && `${conv.relatedTaskIds.size} task${conv.relatedTaskIds.size > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className={`flex-1 flex flex-col bg-gradient-to-b from-background to-muted/20 ${selectedUserId ? 'flex' : 'hidden md:flex'}`}>
          {selectedConversation ? (
            <>
              <div className="p-3 md:p-4 border-b bg-card/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden shrink-0"
                      onClick={() => setSelectedUserId(null)}
                      data-testid="button-back-to-conversations"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className={`w-8 h-8 md:w-10 md:h-10 ${getAvatarColor(selectedConversation.user.id)}`}>
                      <AvatarFallback className="text-white font-medium text-sm">
                        {getInitials(selectedConversation.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{getDisplayName(selectedConversation.user)}</h2>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                          {selectedConversation.user.role}
                        </Badge>
                        {selectedConversation.user.email && (
                          <span className="text-xs text-muted-foreground">
                            {selectedConversation.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {contextOptions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contextOptions.map(opt => (
                      <Button
                        key={opt.id}
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(opt.type === 'request' ? `/requests/${opt.id}` : `/tasks/${opt.id}`)}
                        className="text-xs h-7 gap-1"
                        data-testid={`button-view-${opt.type}-${opt.id}`}
                      >
                        <FileText className="w-3 h-3" />
                        {opt.label.length > 25 ? `${opt.label.substring(0, 25)}...` : opt.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {conversationMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${getAvatarColor(selectedConversation.user.id)}`}>
                      <span className="text-white text-2xl font-medium">
                        {getInitials(selectedConversation.user)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{getDisplayName(selectedConversation.user)}</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Start a conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((message, index) => {
                      const isOwn = message.senderId === user?.id;
                      const showTimestamp = index === 0 || 
                        (conversationMessages[index - 1] && 
                          new Date(message.createdAt || 0).getTime() - new Date(conversationMessages[index - 1].createdAt || 0).getTime() > 300000);
                      
                      const prevContext = index > 0 ? getMessageContext(conversationMessages[index - 1]) : null;
                      const currentContext = getMessageContext(message);
                      const showContextChange = currentContext && (!prevContext || prevContext.id !== currentContext.id);

                      return (
                        <div key={message.id}>
                          {showTimestamp && message.createdAt && (
                            <div className="text-center my-4">
                              <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                {formatFullMessageTime(new Date(message.createdAt))}
                              </span>
                            </div>
                          )}
                          {showContextChange && (
                            <div className="text-center my-2">
                              <span className="text-xs text-muted-foreground/70">
                                Re: {currentContext.label}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
                            data-testid={`message-${message.id}`}
                          >
                            <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                              {!isOwn && (
                                <Avatar className={`w-7 h-7 ${getAvatarColor(message.senderId)} flex-shrink-0`}>
                                  <AvatarFallback className="text-white text-xs">
                                    {getInitials(selectedConversation.user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`px-4 py-2.5 shadow-sm ${
                                  isOwn
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md"
                                    : "bg-card border rounded-2xl rounded-bl-md"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              </div>
                              {user?.role === "admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this message?")) {
                                      deleteMessageMutation.mutate(message.id);
                                    }
                                  }}
                                  data-testid={`button-delete-message-${message.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
                {contextOptions.length > 1 && (
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Replying to:</label>
                    <Select value={selectedContextId || ""} onValueChange={setSelectedContextId}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-reply-context">
                        <SelectValue placeholder="Select request or task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contextOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id} className="text-xs">
                            {opt.type === 'request' ? '📋' : '📌'} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="resize-none min-h-[44px] max-h-32 pr-12 bg-muted/50 border-0 focus-visible:ring-1 rounded-2xl"
                      rows={1}
                      data-testid="textarea-new-message"
                    />
                  </div>
                  <Button
                    onClick={() => sendMessageMutation.mutate(newMessage)}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending || !selectedContextId}
                    size="icon"
                    className="rounded-full h-11 w-11 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                    data-testid="button-send-message"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                <MessageCircle className="w-12 h-12 text-primary/60" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
              <p className="text-muted-foreground max-w-sm">
                Select a conversation from the left to view your message history and continue chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
