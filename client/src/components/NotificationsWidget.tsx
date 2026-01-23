import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X, FileWarning, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

function getNotificationIcon(type: string) {
  switch (type) {
    case "document_expiration":
      return <FileWarning className="h-4 w-4 text-amber-500" />;
    case "task_reminder":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "task_overdue":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatTimeAgo(date: Date | string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export default function NotificationsWidget() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/notifications/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/notifications/dismiss-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = countData?.count || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      setLocation(notification.link);
      setOpen(false);
    }
  };

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      data-testid="button-notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-medium bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  const notificationsList = (
    <>
      <ScrollArea className="max-h-[60vh] sm:max-h-80">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className={`p-3 hover-elevate cursor-pointer transition-colors ${
                    !notification.isRead ? "bg-accent/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissMutation.mutate(notification.id);
                          }}
                          data-testid={`button-dismiss-${notification.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.createdAt!)}
                        </span>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate(notification.id);
                            }}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="h-3 w-3 mr-0.5" />
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  const headerActions = notifications.length > 0 && (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => markAllReadMutation.mutate()}
        disabled={markAllReadMutation.isPending}
        data-testid="button-mark-all-read"
      >
        <CheckCheck className="h-3 w-3 mr-1" />
        Read all
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => dismissAllMutation.mutate()}
        disabled={dismissAllMutation.isPending}
        data-testid="button-dismiss-all"
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] px-0" data-testid="notifications-panel">
          <SheetHeader className="px-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Notifications</SheetTitle>
              {headerActions}
            </div>
          </SheetHeader>
          <div className="px-0">
            {notificationsList}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        data-testid="notifications-panel"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium text-sm">Notifications</h4>
          {headerActions}
        </div>
        {notificationsList}
      </PopoverContent>
    </Popover>
  );
}
