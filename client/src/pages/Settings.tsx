import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Car,
  ClipboardList,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  Shield,
  Store,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import type { EmergencyContact, NotificationSetting, User as UserType } from "@shared/schema";
import EmergencyContacts from "./EmergencyContacts";
import DepartmentSettings from "./DepartmentSettings";
import type { Area } from "@shared/schema";

type InventorySummaryResponse = {
  total: number;
  lowStockCount: number;
  categoryCounts: Record<string, number>;
};

type SystemSettingCard = {
  title: string;
  description: string;
  status: "available" | "embedded" | "planned";
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  href?: string;
  tab?: "emergency" | "departments";
  testId: string;
};

type SystemSettingSection = {
  title: string;
  description: string;
  cards: SystemSettingCard[];
};

const systemSettingSections: SystemSettingSection[] = [
  {
    title: "Available Settings",
    description: "These areas already have working admin screens or embedded editors.",
    cards: [
      {
        title: "Email & Notifications",
        description: "Manage email templates, notification toggles, and delivery logs.",
        status: "available",
        icon: Mail,
        actionLabel: "Open Email Settings",
        href: "/email-management",
        testId: "button-open-email-settings",
      },
      {
        title: "Users, Roles & Access",
        description: "Manage users, pending signups, credentials, and role assignments.",
        status: "available",
        icon: Users,
        actionLabel: "Open User Settings",
        href: "/users",
        testId: "button-open-user-settings",
      },
      {
        title: "Departments",
        description: "Manage Plant Services departments for the dashboard, work queues, and task routing.",
        status: "embedded",
        icon: Building2,
        actionLabel: "Manage Departments",
        tab: "departments",
        testId: "button-open-department-settings",
      },
      {
        title: "Emergency Contacts",
        description: "Set the active after-hours contact shown to staff.",
        status: "embedded",
        icon: Phone,
        actionLabel: "Manage Emergency Contacts",
        tab: "emergency",
        testId: "button-open-emergency-settings",
      },
      {
        title: "Vendors",
        description: "Maintain the vendor directory used by work orders and estimates.",
        status: "available",
        icon: Store,
        actionLabel: "Open Vendors",
        href: "/vendors",
        testId: "button-open-vendor-settings",
      },
      {
        title: "Facilities & Properties",
        description: "Manage properties, spaces, equipment, and facility context.",
        status: "available",
        icon: MapPin,
        actionLabel: "Open Properties",
        href: "/properties",
        testId: "button-open-property-settings",
      },
      {
        title: "Inventory Operations",
        description: "Manage parts, stock levels, imports, exports, barcode data, and low-stock views.",
        status: "available",
        icon: Package,
        actionLabel: "Open Inventory",
        href: "/inventory",
        testId: "button-open-inventory-settings",
      },
      {
        title: "Fleet & Lockboxes",
        description: "Manage vehicles, reservations, lockboxes, and fleet access codes.",
        status: "available",
        icon: Car,
        actionLabel: "Open Fleet Settings",
        href: "/vehicles?tab=codehub",
        testId: "button-open-fleet-settings",
      },
    ],
  },
  {
    title: "Recommended Next Settings",
    description: "These are strong candidates for a future DB-backed settings API.",
    cards: [
      {
        title: "Organization Profile",
        description: "School/company name, support contact, timezone, logo, and business hours.",
        status: "planned",
        icon: Building2,
        actionLabel: "Needs settings API",
        testId: "button-planned-organization-settings",
      },
      {
        title: "Request Defaults",
        description: "Request categories, default urgency, and approval rules.",
        status: "planned",
        icon: ClipboardList,
        actionLabel: "Needs settings API",
        testId: "button-planned-request-settings",
      },
      {
        title: "Work Order Defaults",
        description: "Default task priority, assignment behavior, due-date rules, and photo/estimate requirements.",
        status: "planned",
        icon: Wrench,
        actionLabel: "Needs settings API",
        testId: "button-planned-work-order-settings",
      },
      {
        title: "Inventory Catalog",
        description: "Centralize inventory categories, tracking defaults, and low-stock defaults.",
        status: "planned",
        icon: Package,
        actionLabel: "Needs settings API",
        testId: "button-planned-inventory-catalog-settings",
      },
      {
        title: "Fleet Policy",
        description: "Reservation windows, checkout requirements, verification rules, and document reminders.",
        status: "planned",
        icon: Car,
        actionLabel: "Needs settings API",
        testId: "button-planned-fleet-policy-settings",
      },
      {
        title: "Security Policy",
        description: "Password policy, session timeout, signup limits, and deployment health checks.",
        status: "planned",
        icon: Shield,
        actionLabel: "Needs settings API",
        testId: "button-planned-security-settings",
      },
    ],
  },
];

const settingStatusLabels = {
  available: "Built",
  embedded: "Embedded",
  planned: "Planned",
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const notificationCounts = useNotificationCounts();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tabParam = params.get("tab");

  const isAdmin = user?.role === "admin";
  const adminTabParam =
    isAdmin && (tabParam === "emergency" || tabParam === "departments" || tabParam === "system")
      ? tabParam
      : undefined;
  const defaultTab = adminTabParam || "account";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (isAdmin && (tabParam === "emergency" || tabParam === "departments" || tabParam === "system")) {
      setActiveTab(tabParam);
      return;
    }
    if (!tabParam) {
      setActiveTab("account");
    }
  }, [tabParam, isAdmin]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "account") {
      navigate("/settings", { replace: true });
    } else {
      navigate(`/settings?tab=${value}`, { replace: true });
    }
  };

  const handleSystemCardAction = (card: SystemSettingCard) => {
    if (card.tab) {
      handleTabChange(card.tab);
      return;
    }
    if (card.href) {
      navigate(card.href);
    }
  };

  const getSystemCardStatusText = (card: SystemSettingCard) => {
    const safeNotificationSettings = Array.isArray(notificationSettings) ? notificationSettings : [];
    const safeDepartments = Array.isArray(departments) ? departments : [];

    switch (card.testId) {
      case "button-open-email-settings":
        return safeNotificationSettings.length > 0
          ? `${safeNotificationSettings.length} notification rules configured`
          : "No notification rules found";
      case "button-open-user-settings":
        return notificationCounts.pendingSignups > 0
          ? `${notificationCounts.pendingSignups} pending signup${notificationCounts.pendingSignups === 1 ? "" : "s"}`
          : "No pending signups";
      case "button-open-department-settings":
        return safeDepartments.length > 0
          ? `${safeDepartments.length} department${safeDepartments.length === 1 ? "" : "s"} configured`
          : "No departments configured";
      case "button-open-emergency-settings":
        return activeEmergencyContact
          ? `Active: ${activeEmergencyContact.name}`
          : "No active contact";
      case "button-open-inventory-settings":
        if (!inventorySummary) return undefined;
        return inventorySummary.lowStockCount > 0
          ? `${inventorySummary.lowStockCount} low-stock item${inventorySummary.lowStockCount === 1 ? "" : "s"}`
          : `${inventorySummary.total} items tracked`;
      default:
        return undefined;
    }
  };

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const { data: activeEmergencyContact } = useQuery<EmergencyContact | null>({
    queryKey: ["/api/emergency-contacts/active"],
    enabled: isAdmin,
  });

  const { data: notificationSettings = [] } = useQuery<NotificationSetting[]>({
    queryKey: ["/api/notification-settings"],
    enabled: isAdmin,
  });

  const { data: inventorySummary } = useQuery<InventorySummaryResponse>({
    queryKey: ["/api/inventory", "summary"],
    enabled: isAdmin,
  });

  const { data: departments = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
    enabled: isAdmin,
  });

  const profileUser = currentUser || user;

  useEffect(() => {
    if (!profileUser) return;
    setFirstName(profileUser.firstName || "");
    setLastName(profileUser.lastName || "");
    setEmail(profileUser.email || "");
    setPhoneNumber(profileUser.phoneNumber || "");
  }, [
    profileUser?.id,
    profileUser?.firstName,
    profileUser?.lastName,
    profileUser?.email,
    profileUser?.phoneNumber,
  ]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; phoneNumber: string }) => {
      return await apiRequest("PATCH", `/api/users/${user?.id}/profile`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/users/change-password", data);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      firstName,
      lastName,
      email,
      phoneNumber,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <div className="space-y-3 p-3 md:p-0">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Settings</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Manage your account and administrative settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList data-testid="settings-tabs">
          <TabsTrigger value="account" data-testid="tab-account">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="system" data-testid="tab-system">
                <Shield className="w-4 h-4 mr-2" />
                System
              </TabsTrigger>
              <TabsTrigger value="departments" data-testid="tab-departments">
                <Building2 className="w-4 h-4 mr-2" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="emergency" data-testid="tab-emergency">
                <Phone className="w-4 h-4 mr-2" />
                Emergency Contacts
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <div className="grid gap-4 md:gap-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter first name"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter last name"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                      data-testid="input-phone-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={user?.username || ""}
                      disabled
                      className="bg-muted"
                      data-testid="input-username-disabled"
                    />
                    <p className="text-xs text-muted-foreground">
                      Username cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={user?.role || ""}
                      disabled
                      className="bg-muted capitalize"
                      data-testid="input-role-disabled"
                    />
                    <p className="text-xs text-muted-foreground">
                      Role is managed by administrators
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-update-profile"
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      data-testid="input-current-password"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      data-testid="input-new-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters long
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    data-testid="button-change-password"
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="system" className="mt-4">
            <div className="space-y-6 max-w-6xl">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings Hub</CardTitle>
                  <CardDescription>
                    A centralized admin launchpad for configuration, access, notifications, and future system policies. Operational workspaces like Resources stay in the main navigation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border p-3">
                      <div className="text-2xl font-semibold">7</div>
                      <p className="text-xs text-muted-foreground">built admin settings areas</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-2xl font-semibold">2</div>
                      <p className="text-xs text-muted-foreground">embedded settings editors</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-2xl font-semibold">5</div>
                      <p className="text-xs text-muted-foreground">recommended dynamic settings to add</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {systemSettingSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {section.cards.map((card) => {
                      const Icon = card.icon;
                      const isPlanned = card.status === "planned";
                      const cardStatusText = getSystemCardStatusText(card);
                      return (
                        <Card key={card.title} className="flex flex-col">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Icon className="w-5 h-5" />
                                {card.title}
                              </CardTitle>
                              <Badge variant={isPlanned ? "secondary" : "default"}>
                                {settingStatusLabels[card.status]}
                              </Badge>
                            </div>
                            <CardDescription>{card.description}</CardDescription>
                            {cardStatusText && (
                              <p className="text-xs text-muted-foreground pt-1" data-testid={`status-${card.testId}`}>
                                {cardStatusText}
                              </p>
                            )}
                          </CardHeader>
                          <CardContent className="mt-auto">
                            <Button
                              variant={isPlanned ? "outline" : "default"}
                              disabled={isPlanned}
                              onClick={() => handleSystemCardAction(card)}
                              data-testid={card.testId}
                            >
                              {card.actionLabel}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="departments" className="mt-4">
            <DepartmentSettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="emergency" className="mt-4">
            <EmergencyContacts />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
