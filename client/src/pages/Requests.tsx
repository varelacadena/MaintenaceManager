import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const { data: requests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: areas = [] } = useQuery<any[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions = [] } = useQuery<any[]>({
    queryKey: ["/api/subdivisions"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
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

  // Helper functions
  const getRequesterName = (requesterId: string) => {
    if (!users || users.length === 0) return "Unknown";
    const requester = users.find((u: any) => u.id === requesterId);
    return requester ? `${requester.firstName} ${requester.lastName}` : "Unknown";
  };

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return "Not specified";
    if (!areas || areas.length === 0) return "Unknown";
    const area = areas.find((a: any) => a.id === areaId);
    return area?.name || "Unknown";
  };

  const getSubdivisionName = (subdivisionId: string | null) => {
    if (!subdivisionId) return null;
    if (!subdivisions || subdivisions.length === 0) return null;
    const subdivision = subdivisions.find((s: any) => s.id === subdivisionId);
    return subdivision?.name || null;
  };

  const filteredRequests = requests.filter((request) => {
    const query = searchQuery.toLowerCase();
    const requesterName = getRequesterName(request.requesterId).toLowerCase();
    const areaName = getAreaName(request.areaId).toLowerCase();
    const subdivisionName = getSubdivisionName(request.subdivisionId)?.toLowerCase() || "";
    
    const matchesSearch =
      request.id.toLowerCase().includes(query) ||
      requesterName.includes(query) ||
      request.title.toLowerCase().includes(query) ||
      request.description.toLowerCase().includes(query) ||
      areaName.includes(query) ||
      subdivisionName.includes(query);
    
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
        <Button onClick={() => navigate("/requests/new")} data-testid="button-new-request">
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
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
        <div className="grid gap-4">
          {filteredRequests.map((request) => {
            const subdivisionName = getSubdivisionName(request.subdivisionId);

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`card-request-${request.id}`}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                    {/* Left Column: Requester & Status Info */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Request ID</p>
                        <p className="font-mono text-sm font-medium">#{request.id.slice(0, 8)}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Submitted by</p>
                        <p className="font-medium" data-testid={`text-requester-${request.id}`}>
                          {getRequesterName(request.requesterId)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Date Submitted</p>
                        <p className="font-medium">{new Date(request.createdAt!).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                        <Badge variant="outline" className={statusColors[request.status]} data-testid={`badge-status-${request.id}`}>
                          {request.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Urgency</p>
                        <Badge variant="outline" className={urgencyColors[request.urgency]} data-testid={`badge-urgency-${request.id}`}>
                          {request.urgency.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Right Column: Request Details */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Request Title</p>
                        <CardTitle className="text-xl mb-3">{request.title}</CardTitle>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                        <p className="text-sm text-foreground leading-relaxed">{request.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Area</p>
                          <p className="font-medium text-sm">{getAreaName(request.areaId)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Location</p>
                          <p className="font-medium text-sm">{subdivisionName || "Not specified"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/requests/${request.id}`)}
                          data-testid={`button-view-${request.id}`}
                        >
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        {canManageRequests && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
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

                        {(isStaff && request.requesterId === user?.id && request.status === "submitted") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/requests/${request.id}/edit`)}
                              data-testid={`button-edit-${request.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
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
                          </>
                        )}
                      </div>
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