import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Search, Plus, Trash2, Edit, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ServiceRequest } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  under_review: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  converted_to_task: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

const urgencyColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
};

export default function Requests() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const { data: requests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Fetch individual requesters for requests where we don't have user data
  const requesterIds = [...new Set(requests.map(r => r.requesterId))];
  const { data: requesters = {} } = useQuery<Record<string, any>>({
    queryKey: ["/api/requesters", requesterIds],
    queryFn: async () => {
      if (users.length > 0) return {}; // Use users list if available
      
      const requesterData: Record<string, any> = {};
      await Promise.all(
        requesterIds.map(async (id) => {
          try {
            const response = await fetch(`/api/users/${id}`, {
              credentials: 'include',
            });
            if (response.ok) {
              requesterData[id] = await response.json();
            }
          } catch (error) {
            // Silently fail for individual users
          }
        })
      );
      return requesterData;
    },
    enabled: requests.length > 0 && users.length === 0,
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/service-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({ title: "Request deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete request", variant: "destructive" });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason, requesterId, title }: { 
      requestId: string; 
      reason: string;
      requesterId: string;
      title: string;
    }) => {
      // Update request status to rejected
      await apiRequest("PATCH", `/api/service-requests/${requestId}/status`, {
        status: "rejected",
        rejectionReason: reason
      });

      // Send message to requester
      await apiRequest("POST", "/api/messages", {
        requestId,
        content: `Your service request "${title}" has been rejected.\n\nReason: ${reason}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({ title: "Request rejected and requester notified" });
      setRejectionReasons({});
    },
    onError: () => {
      toast({ title: "Failed to reject request", variant: "destructive" });
    },
  });

  const handleRejectRequest = (requestId: string, requesterId: string, title: string) => {
    const reason = rejectionReasons[requestId];
    if (!reason?.trim()) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    rejectRequestMutation.mutate({ requestId, reason, requesterId, title });
  };

  // Helper functions
  const getRequesterName = (requesterId: string) => {
    // First try the users list
    if (users && users.length > 0) {
      const requester = users.find((u: any) => u.id === requesterId);
      if (requester) {
        return `${requester.firstName} ${requester.lastName}`;
      }
    }
    
    // Fall back to individual requester data
    if (requesters && requesters[requesterId]) {
      const requester = requesters[requesterId];
      return `${requester.firstName} ${requester.lastName}`;
    }
    
    return "Unknown";
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return "Not specified";
    if (!properties || properties.length === 0) return "Unknown";
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

  const isMaintenanceOrAdmin = user?.role === "admin" || user?.role === "maintenance";
  const isStaff = user?.role === "staff";

  // Maintenance and admin have same permissions for service requests
  const canManageRequests = isMaintenanceOrAdmin;

  if (isLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Service Requests</h1>
      </div>

      <div className="flex gap-4">
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
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="converted_to_task">Converted to Task</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-urgency-filter">
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
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => {
            const requesterUser = users.find((u: any) => u.id === request.requesterId) || requesters[request.requesterId];
            const requesterName = getRequesterName(request.requesterId);
            const phoneNumber = requesterUser?.phoneNumber || "(555) 890-1234";
            
            return (
              <Card 
                key={request.id} 
                className="hover:shadow-md transition-shadow"
                data-testid={`card-request-${request.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base" data-testid={`text-requester-${request.id}`}>
                          {requesterName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={statusColors[request.status]}
                      >
                        {request.status === 'converted_to_task' ? 'CONVERTED TO TASK' : 
                         request.status === 'under_review' ? 'UNDER REVIEW' : 
                         request.status === 'pending' ? 'PENDING' :
                         request.status === 'rejected' ? 'REJECTED' :
                         request.status.toUpperCase()}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={urgencyColors[request.urgency]}
                      >
                        {request.urgency.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {new Date(request.createdAt!).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {new Date(request.createdAt!).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{getPropertyName(request.propertyId)}</span>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-muted/30 rounded-md">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="link"
                      className="text-primary p-0 h-auto font-normal"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      View Details →
                    </Button>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            data-testid={`button-delete-${request.id}`}
                          >
                            Reject
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
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => navigate(`/requests/${request.id}`)}
                        data-testid={`button-review-${request.id}`}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}