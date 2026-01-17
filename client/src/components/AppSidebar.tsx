import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  MessageSquare,
  Settings,
  Users,
  MapPin,
  Wrench,
  KeyRound,
  Building2,
  Package,
  Map,
  Car,
  BarChart3,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  userRole: "admin" | "staff" | "student" | "technician";
  userName: string;
  userInitials: string;
}

const roleMenus = {
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Service Requests", url: "/requests", icon: ClipboardList },
    { title: "Tasks", url: "/tasks", icon: Wrench },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Vehicle Fleet", url: "/vehicles", icon: Car },
    { title: "Vehicle Reservations", url: "/vehicle-reservations", icon: Calendar },
    { title: "Properties", url: "/properties", icon: Map },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "User Management", url: "/users", icon: Users },
    { title: "Credentials", url: "/credentials", icon: KeyRound },
    { title: "Vendors", url: "/vendors", icon: Building2 },
    { title: "Inventory", url: "/inventory", icon: Package },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  technician: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Tasks", url: "/tasks", icon: Wrench },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  staff: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Requests", url: "/requests", icon: ClipboardList },
    { title: "New Request", url: "/new-request", icon: Wrench },
    { title: "My Reservations", url: "/my-reservations", icon: Car },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  student: [
    { title: "My Tasks", url: "/tasks", icon: ClipboardList },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export default function AppSidebar({ userRole, userName, userInitials }: AppSidebarProps) {
  const [location] = useLocation();
  const menuItems = roleMenus[userRole];
  const notificationCounts = useNotificationCounts();
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Maintenance</h2>
            <p className="text-xs text-muted-foreground">Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                let badgeCount = 0;

                if (item.title === "Messages" && notificationCounts.unreadMessages > 0) {
                  badgeCount = notificationCounts.unreadMessages;
                } else if (item.title === "Service Requests" && notificationCounts.pendingServiceRequests > 0) {
                  badgeCount = notificationCounts.pendingServiceRequests;
                } else if (item.title === "Vehicle Reservations" && notificationCounts.pendingVehicleReservations > 0) {
                  badgeCount = notificationCounts.pendingVehicleReservations;
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link 
                        href={item.url} 
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                          {badgeCount > 0 && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white" data-testid={`badge-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              {badgeCount > 9 ? "9+" : badgeCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate">
          <Avatar className="w-8 h-8">
            <AvatarImage />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}