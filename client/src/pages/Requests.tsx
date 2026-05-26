import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ServiceRequest } from "@shared/schema";
import {
  getServiceRequestStatusLabel,
  getServiceRequestUrgencyLabel,
  serviceRequestStatusBadgeColors,
  serviceRequestUrgencyBadgeColors,
} from "@/lib/serviceRequestLabels";
import { WorkLoadError } from "@/pages/Work/WorkLoadError";
import EmptyState from "@/components/dashboard/EmptyState";

export default function Requests() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const canLoadAllUsers = user?.role === "admin" || user?.role === "technician";
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: canLoadAllUsers,
    retry: false,
  });

  const requesterIds = Array.from(new Set(requests.map((r) => r.requesterId)));
  const { data: requesters = {} } = useQuery<Record<string, any>>({
    queryKey: ["/api/users/requesters", requesterIds],
    queryFn: async () => {
      if (users.length > 0) return {};
      const requesterData: Record<string, any> = {};
      await Promise.all(
        requesterIds.map(async (id) => {
          try {
            const response = await fetch(`/api/users/${id}`, { credentials: "include" });
            if (response.ok) requesterData[id] = await response.json();
          } catch {
            /* ignore */
          }
        })
      );
      return requesterData;
    },
    enabled: requests.length > 0 && users.length === 0,
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/service-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({ title: "Request deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete request", variant: "destructive" });
    },
  });

  const getRequesterName = (requesterId: string) => {
    if (users?.length) {
      const requester = users.find((u: any) => u.id === requesterId);
      if (requester) return `${requester.firstName} ${requester.lastName}`;
    }
    if (requesters[requesterId]) {
      const r = requesters[requesterId];
      return `${r.firstName} ${r.lastName}`;
    }
    return "Unknown";
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return "Not specified";
    const property = properties.find((p: any) => p.id === propertyId);
    return property?.name || "Unknown";
  };

  const filteredRequests = requests.filter((request) => {
    const query = searchQuery.toLowerCase();
    const requesterName = getRequesterName(request.requesterId).toLowerCase();
    const propertyName = getPropertyName(request.propertyId).toLowerCase();
    const matchesSearch =
      request.id.toLowerCase().includes(query) ||
      requesterName.includes(query) ||
      request.title.toLowerCase().includes(query) ||
      request.description.toLowerCase().includes(query) ||
      propertyName.includes(query);
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesUrgency = urgencyFilter === "all" || request.urgency === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const canReviewRequests = user?.role === "admin";
  const isSubmitterView = user?.role !== "admin";

  const canDeleteRequest = (request: ServiceRequest) =>
    user?.role === "admin" || request.requesterId === user?.id;

  if (isLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 md:p-4 max-w-lg">
        <WorkLoadError
          title="Could not load requests"
          message={error instanceof Error ? error.message : "Something went wrong."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const renderActions = (request: ServiceRequest) => (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={() => navigate(`/requests/${request.id}`)}
        data-testid={`button-review-${request.id}`}
      >
        {canReviewRequests ? "Review" : "View"}
      </Button>
      {canDeleteRequest(request) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              data-testid={`button-delete-${request.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Request?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this service request. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRequestMutation.mutate(request.id)}
                data-testid={`button-confirm-delete-${request.id}`}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  return (
    <div className="p-3 md:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            {isSubmitterView ? "My Service Requests" : "Service Requests"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSubmitterView
              ? "View and track requests you have submitted"
              : "Manage and review all maintenance requests"}
          </p>
        </div>
        {isSubmitterView && (
          <Button onClick={() => navigate("/new-request")} data-testid="button-new-request">
            New Request
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">{getServiceRequestStatusLabel("pending")}</SelectItem>
            <SelectItem value="under_review">{getServiceRequestStatusLabel("under_review")}</SelectItem>
            <SelectItem value="converted_to_task">{getServiceRequestStatusLabel("converted_to_task")}</SelectItem>
            <SelectItem value="rejected">{getServiceRequestStatusLabel("rejected")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-urgency-filter">
            <SelectValue placeholder="Filter by urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgencies</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <EmptyState
              icon={ClipboardList}
              title={requests.length === 0 ? "No service requests yet" : "No matching requests"}
              description={
                requests.length === 0
                  ? "Submit a maintenance request to get started."
                  : "Try adjusting your search or filters."
              }
              actionLabel={isSubmitterView ? "New Request" : undefined}
              actionHref={isSubmitterView ? "/new-request" : undefined}
              testId="requests-empty"
            />
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} data-testid={`card-request-${request.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{request.title}</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-requester-${request.id}`}>
                      {getRequesterName(request.requesterId)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 border-0 text-xs", serviceRequestStatusBadgeColors[request.status])}
                  >
                    {getServiceRequestStatusLabel(request.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{getPropertyName(request.propertyId)}</span>
                  <span>·</span>
                  <Badge variant="outline" className={cn("border-0 text-xs", serviceRequestUrgencyBadgeColors[request.urgency])}>
                    {getServiceRequestUrgencyLabel(request.urgency)}
                  </Badge>
                </div>
                {renderActions(request)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requester</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Urgency</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-border/40 hover-elevate transition-all duration-150"
                      data-testid={`card-request-${request.id}`}
                    >
                      <td className="px-6 py-5">
                        <div className="font-medium text-sm" data-testid={`text-requester-${request.id}`}>
                          {getRequesterName(request.requesterId)}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-xs truncate text-sm font-medium">{request.title}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-muted-foreground">{getPropertyName(request.propertyId)}</div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="outline" className={cn("border-0 font-medium", serviceRequestUrgencyBadgeColors[request.urgency])}>
                          {getServiceRequestUrgencyLabel(request.urgency)}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-muted-foreground">
                          {new Date(request.createdAt!).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(request.createdAt!).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          variant="outline"
                          className={cn("font-medium border-0", serviceRequestStatusBadgeColors[request.status])}
                        >
                          {getServiceRequestStatusLabel(request.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">{renderActions(request)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
