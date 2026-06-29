import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Settings,
  Wrench,
  Building2,
  Package,
  Map,
  Car,
  BarChart3,
  FolderKanban,
  LogOut,
  BookOpen,
  Hand,
  Hammer,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { Badge } from "@/components/ui/badge";
import { isNavItemActive } from "@/lib/navigation";
import type { User } from "@shared/schema";
import {
  canManageFleet,
  canManageInventory,
  canManageEquipment,
} from "@shared/techPermissions";

interface AppSidebarProps {
  user: User | null | undefined;
  userName: string;
  userInitials: string;
}

const roleMenus = {
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Service Requests", url: "/requests", icon: ClipboardList },
    { title: "Work", url: "/work", icon: FolderKanban },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Resource Library", url: "/resources", icon: BookOpen },
    { title: "Vehicles", url: "/vehicles", icon: Car },
    { title: "Tools & Equipment", url: "/tools-equipment", icon: Hammer },
    { title: "Properties", url: "/properties", icon: Map },
    { title: "Vendors", url: "/vendors", icon: Building2 },
    { title: "Inventory", url: "/inventory", icon: Package },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  technician: [
    { title: "My Tasks", url: "/work", icon: Wrench },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Grab a Job", url: "/grab", icon: Hand },
    { title: "My Requests", url: "/requests", icon: ClipboardList },
    { title: "New Request", url: "/new-request", icon: Wrench },
    { title: "Vehicle Requests", url: "/my-reservations", icon: Car },
    { title: "Tools & Equipment", url: "/tools-equipment", icon: Hammer },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  staff: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Requests", url: "/requests", icon: ClipboardList },
    { title: "New Request", url: "/new-request", icon: Wrench },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  student: [
    { title: "My Tasks", url: "/work", icon: ClipboardList },
    { title: "Grab a Job", url: "/grab", icon: Hand },
    { title: "My Requests", url: "/requests", icon: ClipboardList },
    { title: "New Request", url: "/new-request", icon: Wrench },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export default function AppSidebar({ user, userName, userInitials }: AppSidebarProps) {
  const [location] = useLocation();
  const userRole = user?.role as "admin" | "staff" | "student" | "technician" | undefined;
  const menuItems = (() => {
    if (!userRole) return [];
    const base = roleMenus[userRole];
    if (userRole !== "technician") return base;

    const extra: typeof base = [];
    if (canManageEquipment(user)) {
      extra.push({ title: "Properties", url: "/properties", icon: Map });
    }
    if (canManageFleet(user)) {
      extra.push({ title: "Vehicles", url: "/vehicles", icon: Car });
    }
    if (canManageInventory(user)) {
      extra.push({ title: "Inventory", url: "/inventory", icon: Package });
    }
    if (extra.length === 0) return base;

    const settingsIndex = base.findIndex((item) => item.url === "/settings");
    if (settingsIndex === -1) return [...base, ...extra];
    return [...base.slice(0, settingsIndex), ...extra, ...base.slice(settingsIndex)];
  })();
  const notificationCounts = useNotificationCounts();
  const { setOpenMobile, isMobile, setOpen } = useSidebar();

  const { data: availableJobCount } = useQuery<{ count: number }>({
    queryKey: ["/api/tasks/available/count"],
    enabled: userRole === "student" || userRole === "technician",
  });

  const handleMouseEnter = () => {
    if (!isMobile) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setOpen(false);
    }
  };

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary shrink-0">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">Maintenance</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                let badgeCount = 0;

                if (item.title === "Service Requests" && notificationCounts.pendingServiceRequests > 0) {
                  badgeCount = notificationCounts.pendingServiceRequests;
                } else if (item.title === "Vehicles" && notificationCounts.pendingVehicleReservations > 0) {
                  badgeCount = notificationCounts.pendingVehicleReservations;
                } else if (item.title === "Settings" && notificationCounts.pendingSignups > 0) {
                  badgeCount = notificationCounts.pendingSignups;
                } else if (item.title === "Grab a Job" && availableJobCount && availableJobCount.count > 0) {
                  badgeCount = availableJobCount.count;
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavItemActive(location, item.url)}
                      tooltip={item.title}
                    >
                      <Link 
                        href={item.url} 
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white group-data-[collapsible=icon]:hidden" data-testid={`badge-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter
        className="shrink-0 border-t border-sidebar-border bg-sidebar px-2 pt-2"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex min-h-12 items-center gap-2 rounded-md p-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage />
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/";
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover-elevate"
            title="Sign Out"
            data-testid="button-sidebar-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}