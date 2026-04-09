import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { serviceRequestStatusLabels } from "@/lib/constants";
import type {
  ServiceRequest,
  Message,
  User as UserType,
  Upload,
  Property,
  Space,
} from "@shared/schema";

export function useRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const isMobile = useIsMobile();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [aiTriageLog, setAiTriageLog] = useState<any>(null);
  const [aiTriageLoading, setAiTriageLoading] = useState(false);

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/request", id],
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: attachments = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
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
        queryKey: ["/api/messages/request", id],
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
        status: "rejected",
        rejectionReason: reason,
      });

      await apiRequest("POST", "/api/messages", {
        requestId,
        content: `Your service request "${request?.title}" has been rejected.\n\nReason: ${reason}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      toast({ title: "Request rejected and requester notified" });
      navigate("/requests");
    },
    onError: () => {
      toast({ title: "Failed to reject request", variant: "destructive" });
    },
  });

  const { data: linkedTask } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: request?.status === "converted_to_task",
    select: (tasks: any[]) => tasks.find((t: any) => t.requestId === id),
  });

  useEffect(() => {
    if (id && messages.length > 0) {
      const hasUnreadMessages = messages.some(
        (msg) => !msg.read && msg.senderId !== user?.id
      );
      if (hasUnreadMessages) {
        markAsReadMutation.mutate(id);
      }
    }
  }, [id, messages, user?.id]);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allSpaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces", request?.propertyId],
    enabled: !!request?.propertyId,
    queryFn: async () => {
      const response = await fetch(`/api/spaces?propertyId=${request?.propertyId}`, { credentials: "include" });
      return response.json();
    },
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

  const handleRunAiTriage = async () => {
    if (!id) return;
    setAiTriageLoading(true);
    try {
      const res = await apiRequest("POST", `/api/ai/triage/${id}`, {});
      const log = await res.json();
      setAiTriageLog(log);
      toast({ title: "AI triage complete", description: "Review the suggestion below." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI analysis could not be completed. Please try again.";
      toast({ title: "AI triage failed", description: message, variant: "destructive" });
    } finally {
      setAiTriageLoading(false);
    }
  };

  const handleReviewAiLog = async (status: "approved" | "rejected") => {
    if (!aiTriageLog) return;
    try {
      await apiRequest("PATCH", `/api/ai-logs/${aiTriageLog.id}`, { status });
      setAiTriageLog({ ...aiTriageLog, status });
      toast({ title: status === "approved" ? "Triage suggestion accepted" : "Triage suggestion rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-logs"] });
    } catch {
      toast({ title: "Failed to update suggestion", variant: "destructive" });
    }
  };

  const requester = request ? users.find(u => u.id === request.requesterId) : undefined;
  const property = request ? properties.find(p => p.id === request.propertyId) : undefined;
  const space = request ? allSpaces.find(s => s.id === request.spaceId) : undefined;

  const isTechnicianOrAdmin = user?.role === "admin" || user?.role === "technician";
  const canTakeAction = isTechnicianOrAdmin && request?.status === "pending";

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "outline" as const;
      case "under_review":
        return "secondary" as const;
      case "converted_to_task":
        return "default" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const getStatusLabel = (status: string) => {
    return serviceRequestStatusLabels[status] || status.replace("_", " ");
  };

  const getPriorityColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
      case "medium":
        return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return {
    id,
    user,
    navigate,
    toast,
    isMobile,
    request,
    isLoading,
    messages,
    attachments,
    linkedTask,
    properties,
    users,
    newMessage, setNewMessage,
    rejectionReason, setRejectionReason,
    detailsOpen, setDetailsOpen,
    aiTriageLog,
    aiTriageLoading,
    rejectRequestMutation,
    sendMessageMutation,
    handleRunAiTriage,
    handleReviewAiLog,
    requester,
    property,
    space,
    isTechnicianOrAdmin,
    canTakeAction,
    getStatusVariant,
    getStatusLabel,
    getPriorityColor,
  };
}

export type RequestDetailHookReturn = ReturnType<typeof useRequestDetail>;
