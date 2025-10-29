import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Wrench,
  Plus,
  MapPin,
  MessageSquare,
} from "lucide-react";
import type { ServiceRequest, Message } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: requests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });

  const { data: allMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const onHoldCount = requests.filter((r) => r.status === "on_hold").length;

  const highUrgencyCount = requests.filter(
    (r) => r.urgency === "high" && r.status !== "completed"
  ).length;

  const recentRequests = requests
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const recentMessages = allMessages
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "on_hold":
        return "bg-orange-500";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || "User"}
          </p>
        </div>
        {user?.role === "staff" && (
          <Link href="/new-request">
            <Button data-testid="button-new-request">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="stat-pending">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="stat-in-progress">
              {inProgressCount}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="stat-completed">
              {completedCount}
            </div>
            <p className="text-xs text-muted-foreground">Tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="stat-high-priority">
              {highUrgencyCount}
            </div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requests/${request.id}`}
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-request-${request.id}`}>
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(
                          request.status
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate">
                            {request.title}
                          </span>
                          <Badge
                            className={`${getUrgencyColor(request.urgency)} no-default-hover-elevate`}
                          >
                            {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {request.category}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((message) => {
                  const request = requests.find(r => r.id === message.requestId);
                  return (
                    <Link
                      key={message.id}
                      href={`/messages`}
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg border hover-elevate active-elevate-2" data-testid={`card-message-${message.id}`}>
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {request?.title || 'Unknown Request'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user?.role === "staff" && (
            <Link href="/new-request">
              <Button className="w-full justify-start" variant="outline" data-testid="button-create-request">
                <Plus className="w-4 h-4 mr-2" />
                Create New Request
              </Button>
            </Link>
          )}
          <Link href="/requests">
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-all">
              <ClipboardList className="w-4 h-4 mr-2" />
              {user?.role === "staff" ? "View My Requests" : "View All Tasks"}
            </Button>
          </Link>
          {user?.role === "admin" && (
            <>
              <Link href="/users">
                <Button className="w-full justify-start" variant="outline" data-testid="button-manage-users">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/areas">
                <Button className="w-full justify-start" variant="outline" data-testid="button-manage-areas">
                  <MapPin className="w-4 h-4 mr-2" />
                  Manage Areas
                </Button>
              </Link>
            </>
          )}
          <Link href="/calendar">
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-calendar">
              <Clock className="w-4 h-4 mr-2" />
              View Calendar
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
