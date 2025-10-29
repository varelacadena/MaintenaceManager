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
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface AppSidebarProps {
  userRole: "admin" | "maintenance" | "staff";
  userName: string;
  userInitials: string;
}

const roleMenus = {
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Service Requests", url: "/requests", icon: ClipboardList },
    { title: "Tasks", url: "/tasks", icon: Wrench },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "User Management", url: "/users", icon: Users },
    { title: "Credentials", url: "/credentials", icon: KeyRound },
    { title: "Vendors", url: "/vendors", icon: Building2 },
    { title: "Inventory", url: "/inventory", icon: Package },
    { title: "Areas & Subdivisions", url: "/areas", icon: MapPin },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  maintenance: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Service Requests", url: "/requests", icon: ClipboardList },
    { title: "My Tasks", url: "/tasks", icon: Wrench },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Vendors", url: "/vendors", icon: Building2 },
    { title: "Inventory", url: "/inventory", icon: Package },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  staff: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Requests", url: "/requests", icon: ClipboardList },
    { title: "New Request", url: "/new-request", icon: Wrench },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export default function AppSidebar({ userRole, userName, userInitials }: AppSidebarProps) {
  const [location] = useLocation();
  const menuItems = roleMenus[userRole];

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
