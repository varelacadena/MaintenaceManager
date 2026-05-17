import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  getServiceRequestStatusLabel,
  getServiceRequestUrgencyLabel,
} from "@/lib/serviceRequestLabels";
import type {
  ServiceRequest,
  User as UserType,
  Upload,
  Property,
  Space,
  Task,
} from "@shared/schema";

export function useRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  const isMobile = useIsMobile();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    data: request,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ServiceRequest>({
    queryKey: ["/api/service-requests", id],
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/request", id],
    enabled: !!id,
  });

  const { data: linkedTask } = useQuery<Task | null>({
    queryKey: ["/api/service-requests", id, "linked-task"],
    enabled: !!id && request?.status === "converted_to_task",
    queryFn: async () => {
      const res = await fetch(`/api/service-requests/${id}/linked-task`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load linked work order");
      return res.json();
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
        status: "rejected",
        rejectionReason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      toast({ title: "Request rejected" });
      navigate("/requests");
    },
    onError: () => {
      toast({ title: "Failed to reject request", variant: "destructive" });
    },
  });

  const markUnderReviewMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
        status: "under_review",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", id] });
      toast({ title: "Marked as under review" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allSpaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces", request?.propertyId],
    enabled: !!request?.propertyId,
    queryFn: async () => {
      const response = await fetch(`/api/spaces?propertyId=${request?.propertyId}`, {
        credentials: "include",
      });
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const requester = request ? users.find((u) => u.id === request.requesterId) : undefined;
  const property = request ? properties.find((p) => p.id === request.propertyId) : undefined;
  const space = request ? allSpaces.find((s) => s.id === request.spaceId) : undefined;

  const isAdmin = user?.role === "admin";
  const canReviewRequest =
    isAdmin && (request?.status === "pending" || request?.status === "under_review");
  const canMarkUnderReview = isAdmin && request?.status === "pending";

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

  const getStatusLabel = (status: string) => getServiceRequestStatusLabel(status);

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

  const getUrgencyLabel = (urgency: string) => getServiceRequestUrgencyLabel(urgency);

  return {
    id,
    user,
    navigate,
    toast,
    isMobile,
    request,
    isLoading,
    isError,
    error,
    refetch,
    attachments,
    linkedTask,
    properties,
    users,
    rejectionReason,
    setRejectionReason,
    detailsOpen,
    setDetailsOpen,
    rejectRequestMutation,
    markUnderReviewMutation,
    requester,
    property,
    space,
    canReviewRequest,
    canMarkUnderReview,
    getStatusVariant,
    getStatusLabel,
    getPriorityColor,
    getUrgencyLabel,
  };
}

export type RequestDetailHookReturn = ReturnType<typeof useRequestDetail>;
