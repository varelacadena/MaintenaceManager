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
  Phone,
  FolderKanban,
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
    { title: "Work", url: "/work", icon: FolderKanban },
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
    { title: "Emergency Contacts", url: "/emergency-contacts", icon: Phone },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  technician: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Tasks", url: "/work", icon: Wrench },
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
    { title: "My Tasks", url: "/work", icon: ClipboardList },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export default function AppSidebar({ userRole, userName, userInitials }: AppSidebarProps) {
  const [location] = useLocation();
  const menuItems = roleMenus[userRole];
  const notificationCounts = useNotificationCounts();
  const { setOpenMobile, isMobile, setOpen } = useSidebar();

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

                if (item.title === "Messages" && notificationCounts.unreadMessages > 0) {
                  badgeCount = notificationCounts.unreadMessages;
                } else if (item.title === "Service Requests" && notificationCounts.pendingServiceRequests > 0) {
                  badgeCount = notificationCounts.pendingServiceRequests;
                } else if (item.title === "Vehicle Reservations" && notificationCounts.pendingVehicleReservations > 0) {
                  badgeCount = notificationCounts.pendingVehicleReservations;
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.title}>
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
                          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-medium text-white group-data-[collapsible=icon]:hidden" data-testid={`badge-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
      <SidebarFooter className="p-2">
        <div className="flex items-center gap-2 p-2 rounded-md hover-elevate group-data-[collapsible=icon]:justify-center">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage />
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}