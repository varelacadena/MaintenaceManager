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
  submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
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
            <SelectItem value="submitted">Submitted</SelectItem>
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium">Requester Name</th>
                    <th className="text-left px-6 py-4 text-sm font-medium">Title</th>
                    <th className="text-left px-6 py-4 text-sm font-medium">Property</th>
                    <th className="text-left px-6 py-4 text-sm font-medium">Submitted</th>
                    <th className="text-left px-6 py-4 text-sm font-medium">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const requesterUser = users.find((u: any) => u.id === request.requesterId) || requesters[request.requesterId];
                    const requesterName = getRequesterName(request.requesterId);
                    const nameParts = requesterName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    return (
                      <tr 
                        key={request.id} 
                        className="border-b hover:bg-muted/30 transition-colors"
                        data-testid={`card-request-${request.id}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium" data-testid={`text-requester-${request.id}`}>
                            {requesterName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate">{request.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{getPropertyName(request.propertyId)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {new Date(request.createdAt!).toLocaleDateString('en-US', { 
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })} at {new Date(request.createdAt!).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className={statusColors[request.status]}
                          >
                            {request.status === 'converted_to_task' ? 'Converted to Task' : 
                             request.status === 'under_review' ? 'Under Review' : 
                             request.status === 'submitted' ? 'Submitted' :
                             request.status === 'rejected' ? 'Rejected' :
                             request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => navigate(`/requests/${request.id}`)}
                              data-testid={`button-review-${request.id}`}
                            >
                              Review
                            </Button>
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}