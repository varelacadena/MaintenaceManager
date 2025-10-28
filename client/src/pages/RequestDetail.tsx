import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type {
  ServiceRequest,
  Message,
  Upload,
  Area,
  Subdivision,
  User as UserType,
} from "@shared/schema";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", id],
    enabled: !!id,
  });

  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
  });

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions = [] } = useQuery<Subdivision[]>({
    queryKey: ["/api/subdivisions"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", { requestId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/request", id] });
      setNewMessage("");
      toast({ title: "Message sent" });
    },
  });

  const handleFileUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const file = result.successful[0];
      
      try {
        await apiRequest("PUT", "/api/uploads", {
          requestId: id,
          name: file.name,
          url: file.uploadURL,
          type: file.type,
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/uploads/request", id] });
        toast({ title: "File uploaded successfully" });
      } catch (error) {
        console.error("Error saving upload:", error);
        toast({ 
          title: "Upload failed", 
          description: "File uploaded but couldn't be saved to database",
          variant: "destructive" 
        });
      }
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!request) {
    return <div className="p-8">Request not found</div>;
  }

  const requester = users.find(u => u.id === request.requesterId);
  const area = areas.find(a => a.id === request.areaId);
  const subdivision = subdivisions.find(s => s.id === request.subdivisionId);
  
  const canConvertToTask = (user?.role === "admin" || user?.role === "maintenance") &&
    (request.status === "submitted" || request.status === "under_review" || request.status === "pending");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-500";
      case "under_review":
        return "bg-yellow-500";
      case "converted_to_task":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/requests")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-request-title">{request.title}</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-request-id">Request #{request.id}</p>
        </div>
        <Badge className={getStatusColor(request.status)} data-testid="badge-status">
          {request.status.replace("_", " ").toUpperCase()}
        </Badge>
        <Badge className={getUrgencyColor(request.urgency)} data-testid="badge-urgency">
          {request.urgency.toUpperCase()}
        </Badge>
        {canConvertToTask && (
          <Link href={`/tasks/new?requestId=${id}`}>
            <Button data-testid="button-convert-to-task">
              Convert to Task
            </Button>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground" data-testid="text-description">{request.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Requester</h3>
                  <p className="text-muted-foreground" data-testid="text-requester">
                    {requester ? `${requester.firstName} ${requester.lastName}` : "Unknown"}
                  </p>
                </div>

                {area && (
                  <div>
                    <h3 className="font-medium mb-2">Area</h3>
                    <p className="text-muted-foreground" data-testid="text-area">{area.name}</p>
                  </div>
                )}

                {subdivision && (
                  <div>
                    <h3 className="font-medium mb-2">Subdivision</h3>
                    <p className="text-muted-foreground" data-testid="text-subdivision">{subdivision.name}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-2">Created</h3>
                  <p className="text-muted-foreground" data-testid="text-created-at">
                    {new Date(request.createdAt!).toLocaleString()}
                  </p>
                </div>
              </div>

              {request.status === "rejected" && request.rejectionReason && (
                <div>
                  <h3 className="font-medium mb-2 text-destructive">Rejection Reason</h3>
                  <p className="text-muted-foreground" data-testid="text-rejection-reason">
                    {request.rejectionReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments ({uploads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploads.length > 0 && (
                  <div className="grid gap-2">
                    {uploads.map((upload) => (
                      <a
                        key={upload.id}
                        href={upload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded hover-elevate active-elevate-2 border"
                        data-testid={`link-attachment-${upload.id}`}
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm">{upload.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                <ObjectUploader
                  onComplete={handleFileUpload}
                  onError={(error) => {
                    console.error("Upload error:", error);
                    toast({ 
                      title: "Upload failed", 
                      description: error.message,
                      variant: "destructive" 
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {messages.map((message) => {
                      const sender = users.find(u => u.id === message.userId);
                      return (
                        <div 
                          key={message.id} 
                          className="border rounded-lg p-3"
                          data-testid={`message-${message.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm" data-testid={`text-sender-${message.id}`}>
                              {sender ? `${sender.firstName} ${sender.lastName}` : "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt!).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm" data-testid={`text-content-${message.id}`}>
                            {message.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    data-testid="textarea-message"
                  />
                  <Button
                    onClick={() => {
                      if (newMessage.trim()) {
                        sendMessageMutation.mutate(newMessage);
                      }
                    }}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
