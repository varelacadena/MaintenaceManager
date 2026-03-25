import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Users as UsersIcon, Mail, Plus, Edit, Trash2, User as UserIcon, Lock, Bot, X, UserPlus, Shield, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SKILL_CATEGORIES = [
  { slug: "hvac", label: "HVAC" },
  { slug: "electrical", label: "Electrical" },
  { slug: "plumbing", label: "Plumbing" },
  { slug: "mechanical", label: "Mechanical / Fleet" },
  { slug: "appliances", label: "Appliances" },
  { slug: "grounds", label: "Grounds / Landscaping" },
  { slug: "janitorial", label: "Janitorial" },
  { slug: "structural", label: "Structural" },
  { slug: "water_treatment", label: "Water Treatment" },
  { slug: "general", label: "General" },
] as const;
const SKILL_LEVELS = ["basic", "intermediate", "advanced"] as const;

const HOURS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MINUTES = ["00","15","30","45"];

function hhmmToTimeParts(hhmm: string): { hour: string; minute: string; period: string } {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const minute = MINUTES.includes(mStr) ? mStr : "00";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const hour = String(hour12).padStart(2, "0");
  return { hour, minute, period };
}

function timePartsToHhmm(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

function TimeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { hour, minute, period } = hhmmToTimeParts(value);
  const update = (h: string, m: string, p: string) => onChange(timePartsToHhmm(h, m, p));
  return (
    <div className="flex items-center gap-1">
      <Select value={hour} onValueChange={(h) => update(h, minute, period)} disabled={disabled}>
        <SelectTrigger className="w-16 h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-xs">:</span>
      <Select value={minute} onValueChange={(m) => update(hour, m, period)} disabled={disabled}>
        <SelectTrigger className="w-16 h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(p) => update(hour, minute, p)} disabled={disabled}>
        <SelectTrigger className="w-16 h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isAiProfileDialogOpen, setIsAiProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<string>("general");
  const [newSkillLevel, setNewSkillLevel] = useState<string>("basic");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("staff");

  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const [editPassword, setEditPassword] = useState("");

  const [isPendingReviewOpen, setIsPendingReviewOpen] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState<any>(null);
  const [denyReason, setDenyReason] = useState("");
  const [isDenyMode, setIsDenyMode] = useState(false);
  const [isEditingPending, setIsEditingPending] = useState(false);
  const [editPendingData, setEditPendingData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    requestedRole: "",
    requestedProperty: "",
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: pendingUsers = [], isLoading: isPendingLoading } = useQuery<any[]>({
    queryKey: ["/api/pending-users"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/pending-users/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
      setIsPendingReviewOpen(false);
      setSelectedPendingUser(null);
      toast({ title: "User Approved", description: "The account has been created and the user has been notified." });
    },
    onError: (error: any) => {
      toast({ title: "Approval Failed", description: error.message || "Failed to approve user", variant: "destructive" });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/pending-users/${id}/deny`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
      setIsPendingReviewOpen(false);
      setSelectedPendingUser(null);
      setDenyReason("");
      setIsDenyMode(false);
      toast({ title: "Request Denied", description: "The user has been notified of the decision." });
    },
    onError: (error: any) => {
      toast({ title: "Denial Failed", description: error.message || "Failed to deny request", variant: "destructive" });
    },
  });

  const updatePendingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const response = await apiRequest("PATCH", `/api/pending-users/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      setSelectedPendingUser(updatedUser);
      setIsEditingPending(false);
      toast({ title: "Request Updated", description: "The pending user information has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const deletePendingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/pending-users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts"] });
      toast({ title: "Request Deleted" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      password: string;
      email?: string;
      phoneNumber?: string;
      firstName?: string;
      lastName?: string;
      role: string;
    }) => {
      const response = await apiRequest("POST", "/api/credentials/create", userData);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({ title: "User created successfully" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/users"] }), 300);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/users"] }), 300);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, userData);
      return response.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      toast({ title: "User updated successfully" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/users"] }), 300);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await apiRequest("PATCH", `/api/credentials/${userId}/password`, {
        password,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setEditPassword("");
      toast({ title: "Password updated successfully" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/users"] }), 300);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update password",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/credentials/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const { data: userAvailability = [] } = useQuery<any[]>({
    queryKey: ["/api/users", selectedUser?.id, "availability"],
    queryFn: () => apiRequest("GET", `/api/users/${selectedUser!.id}/availability`).then((r) => r.json()),
    enabled: !!selectedUser && isAiProfileDialogOpen,
  });

  const { data: userSkills = [] } = useQuery<any[]>({
    queryKey: ["/api/users", selectedUser?.id, "skills"],
    queryFn: () => apiRequest("GET", `/api/users/${selectedUser!.id}/skills`).then((r) => r.json()),
    enabled: !!selectedUser && isAiProfileDialogOpen,
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async ({ userId, schedules }: { userId: string; schedules: any[] }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/availability`, { schedules });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser?.id, "availability"] });
      toast({ title: "Availability saved" });
    },
    onError: () => toast({ title: "Failed to save availability", variant: "destructive" }),
  });

  const addSkillMutation = useMutation({
    mutationFn: async ({ userId, skill }: { userId: string; skill: any }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/skills`, skill);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser?.id, "skills"] });
      setNewSkillName("");
      setNewSkillCategory("general");
      setNewSkillLevel("basic");
      toast({ title: "Skill added" });
    },
    onError: () => toast({ title: "Failed to add skill", variant: "destructive" }),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async ({ userId, skillId }: { userId: string; skillId: number }) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}/skills/${skillId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUser?.id, "skills"] });
      toast({ title: "Skill removed" });
    },
    onError: () => toast({ title: "Failed to remove skill", variant: "destructive" }),
  });

  const [localSchedule, setLocalSchedule] = useState<Record<number, { startTime: string; endTime: string; isAvailable: boolean }>>({});

  const initSchedule = (availability: any[]) => {
    const sched: Record<number, { startTime: string; endTime: string; isAvailable: boolean }> = {};
    for (let d = 0; d < 7; d++) {
      const existing = availability.find((a: any) => a.dayOfWeek === d);
      sched[d] = existing
        ? { startTime: existing.startTime, endTime: existing.endTime, isAvailable: existing.isAvailable }
        : { startTime: "08:00", endTime: "17:00", isAvailable: d >= 1 && d <= 5 };
    }
    setLocalSchedule(sched);
  };

  const openAiProfileDialog = (user: User) => {
    setSelectedUser(user);
    initSchedule([]);
    setIsAiProfileDialogOpen(true);
  };

  useEffect(() => {
    if (isAiProfileDialogOpen) {
      initSchedule(userAvailability);
    }
  }, [isAiProfileDialogOpen, userAvailability]);

  const handleSaveAvailability = () => {
    if (!selectedUser) return;
    const schedules = Object.entries(localSchedule).map(([day, s]) => ({
      dayOfWeek: parseInt(day),
      startTime: s.startTime,
      endTime: s.endTime,
      isAvailable: s.isAvailable,
    }));
    saveAvailabilityMutation.mutate({ userId: selectedUser.id, schedules });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newSkillName.trim()) return;
    addSkillMutation.mutate({
      userId: selectedUser.id,
      skill: { skillName: newSkillName.trim(), skillCategory: newSkillCategory, proficiencyLevel: newSkillLevel },
    });
  };

  const resetCreateForm = () => {
    setNewUsername("");
    setNewPassword("");
    setNewEmail("");
    setNewPhoneNumber("");
    setNewFirstName("");
    setNewLastName("");
    setNewRole("staff");
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      username: newUsername,
      password: newPassword,
      email: newEmail || undefined,
      phoneNumber: newPhoneNumber || undefined,
      firstName: newFirstName || undefined,
      lastName: newLastName || undefined,
      role: newRole,
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({
        userId: selectedUser.id,
        userData: {
          username: editUsername,
          email: editEmail,
          phoneNumber: editPhoneNumber,
          firstName: editFirstName,
          lastName: editLastName,
        },
      });
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && editPassword) {
      updatePasswordMutation.mutate({
        userId: selectedUser.id,
        password: editPassword,
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone if the user has associated data.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUsername(user.username || "");
    setEditEmail(user.email || "");
    setEditPhoneNumber(user.phoneNumber || "");
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setEditPassword("");
    setIsPasswordDialogOpen(true);
  };

  const openProfileDialog = (user: User) => {
    setSelectedUser(user);
    setIsProfileDialogOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500 text-white";
      case "technician":
        return "bg-blue-500 text-white";
      case "staff":
        return "bg-green-500 text-white";
      case "student":
        return "bg-amber-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "technician":
        return "Technician";
      case "staff":
        return "Staff";
      case "student":
        return "Student";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold mb-1" data-testid="text-user-management-title">User Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage users, roles, and credentials</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" data-testid="button-create-user">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with login credentials
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    data-testid="input-new-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    data-testid="input-new-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    data-testid="input-new-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    data-testid="input-new-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    data-testid="input-new-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create-user"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Total</CardTitle>
            <UsersIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-total-users">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Admin</CardTitle>
            <Shield className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-admin-count">
              {users.filter((u) => u.role === "admin").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Technician</CardTitle>
            <UsersIcon className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-technician-count">
              {users.filter((u) => u.role === "technician").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Staff</CardTitle>
            <UsersIcon className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-staff-count">
              {users.filter((u) => u.role === "staff").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Student</CardTitle>
            <UsersIcon className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-semibold" data-testid="text-student-count">
              {users.filter((u) => u.role === "student").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" data-testid="tabs-user-management">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending" className="gap-1.5">
            Pending
            {pendingUsers.filter((p: any) => p.status === "pending").length > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 text-[9px] font-medium text-white px-1" data-testid="badge-pending-count">
                {pendingUsers.filter((p: any) => p.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="credentials" data-testid="tab-credentials">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-base md:text-lg">All Users</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="space-y-3">
                {users.map((user) => {
                  const initials =
                    user.firstName && user.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username?.[0]?.toUpperCase() || "U";

                  return (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 rounded-lg border"
                      data-testid={`user-${user.id}`}
                    >
                      <Avatar className="w-10 h-10 md:w-12 md:h-12">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm md:text-base">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username}
                          </span>
                          <Badge
                            className={`${getRoleBadgeColor(user.role)} no-default-hover-elevate text-xs`}
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{user.email || user.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={user.role}
                          onValueChange={(role) =>
                            updateRoleMutation.mutate({ userId: user.id, role })
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {(user.role === "technician" || user.role === "student") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAiProfileDialog(user)}
                            data-testid={`button-ai-profile-${user.id}`}
                            title="AI Profile (Availability & Skills)"
                            className="gap-1.5"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            AI Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="p-3 md:p-4">
              <CardTitle className="text-base md:text-lg">Access Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              {isPendingLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-pending">
                  No signup requests
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((pu: any) => {
                    const initials = `${pu.firstName?.[0] || ""}${pu.lastName?.[0] || ""}`.toUpperCase() || "?";
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                      expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                    };
                    const daysSinceSubmission = pu.submittedAt
                      ? Math.floor((Date.now() - new Date(pu.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const agingClass = pu.status === "pending" && daysSinceSubmission > 5
                      ? "border-red-400 dark:border-red-600 border-2"
                      : "";
                    return (
                      <div
                        key={pu.id}
                        className={`flex items-center gap-3 p-3 rounded-md border ${agingClass}`}
                        data-testid={`pending-user-${pu.id}`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{pu.firstName} {pu.lastName}</span>
                            <Badge variant="outline" className="text-[10px]">{pu.requestedRole}</Badge>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[pu.status] || ""}`}>
                              {pu.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span>{pu.username}</span>
                            <span>{pu.email}</span>
                            {pu.submittedAt && <span>Submitted {new Date(pu.submittedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {pu.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedPendingUser(pu);
                                  setIsDenyMode(false);
                                  setDenyReason("");
                                  setIsPendingReviewOpen(true);
                                }}
                                data-testid={`button-review-${pu.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => approveMutation.mutate(pu.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-quick-approve-${pu.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedPendingUser(pu);
                                  setIsDenyMode(true);
                                  setDenyReason("");
                                  setIsPendingReviewOpen(true);
                                }}
                                data-testid={`button-quick-deny-${pu.id}`}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {pu.status !== "pending" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deletePendingMutation.mutate(pu.id)}
                              data-testid={`button-delete-pending-${pu.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phoneNumber || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={`${getRoleBadgeColor(user.role)} no-default-hover-elevate`}>
                              {user.role}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openProfileDialog(user)}
                            data-testid={`button-view-${user.id}`}
                            title="View Profile"
                          >
                            <UserIcon className="w-4 h-4" />
                          </Button>
                          {(user.role === "technician" || user.role === "student") && (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => openAiProfileDialog(user)}
                              data-testid={`button-ai-profile-cred-${user.id}`}
                              title="AI Profile (Availability & Skills)"
                            >
                              <Bot className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEditDialog(user)}
                            data-testid={`button-edit-${user.id}`}
                            title="Edit Info"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openPasswordDialog(user)}
                            data-testid={`button-password-${user.id}`}
                            title="Change Password"
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            data-testid={`button-delete-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription>
              Update information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editUsername">Username</Label>
                <Input
                  id="editUsername"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  data-testid="input-edit-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  data-testid="input-edit-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">Phone Number</Label>
                <Input
                  id="editPhoneNumber"
                  type="tel"
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  data-testid="input-edit-firstname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLastName">Last Name</Label>
              <Input
                id="editLastName"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                data-testid="input-edit-lastname"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                data-testid="button-submit-edit-user"
              >
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update password for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editPassword">New Password</Label>
              <Input
                id="editPassword"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                required
                data-testid="input-edit-password"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                data-testid="button-submit-edit-password"
              >
                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Complete information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge className={`${getRoleBadgeColor(selectedUser.role)} no-default-hover-elevate`}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">First Name</p>
                  <p className="font-medium">{selectedUser.firstName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Name</p>
                  <p className="font-medium">{selectedUser.lastName || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.phoneNumber || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Profile Dialog — Availability & Skills */}
      <Dialog
        open={isAiProfileDialogOpen}
        onOpenChange={(open) => {
          setIsAiProfileDialogOpen(open);
          if (!open) setLocalSchedule({});
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Profile — {selectedUser?.firstName && selectedUser?.lastName ? `${selectedUser.firstName} ${selectedUser.lastName}` : selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Configure availability and skills used by the AI scheduling agent
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="availability">
            <TabsList className="w-full">
              <TabsTrigger value="availability" className="flex-1">Availability</TabsTrigger>
              <TabsTrigger value="skills" className="flex-1">Skills</TabsTrigger>
            </TabsList>

            <TabsContent value="availability" className="space-y-4 mt-4">
              <div className="space-y-2">
                {DAY_NAMES.map((day, idx) => {
                  const slot = localSchedule[idx] || { startTime: "08:00", endTime: "17:00", isAvailable: idx >= 1 && idx <= 5 };
                  return (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 flex-wrap">
                      <Switch
                        checked={slot.isAvailable}
                        onCheckedChange={(checked) =>
                          setLocalSchedule((prev) => ({ ...prev, [idx]: { ...slot, isAvailable: checked } }))
                        }
                        data-testid={`switch-day-${idx}`}
                      />
                      <span className="w-24 text-sm font-medium">{day}</span>
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <TimeSelect
                          value={slot.startTime}
                          onChange={(v) => setLocalSchedule((prev) => ({ ...prev, [idx]: { ...slot, startTime: v } }))}
                          disabled={!slot.isAvailable}
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <TimeSelect
                          value={slot.endTime}
                          onChange={(v) => setLocalSchedule((prev) => ({ ...prev, [idx]: { ...slot, endTime: v } }))}
                          disabled={!slot.isAvailable}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                onClick={handleSaveAvailability}
                disabled={saveAvailabilityMutation.isPending}
                data-testid="button-save-availability"
              >
                {saveAvailabilityMutation.isPending ? "Saving..." : "Save Availability"}
              </Button>
            </TabsContent>

            <TabsContent value="skills" className="space-y-4 mt-4">
              {/* Existing Skills */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Skills</p>
                {userSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills configured yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userSkills.map((skill: any) => (
                      <div
                        key={skill.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-sm bg-muted/30"
                        data-testid={`skill-${skill.id}`}
                      >
                        <span className="font-medium">{skill.skillName}</span>
                        <Badge variant="outline" className="text-xs">{SKILL_CATEGORIES.find(c => c.slug === skill.skillCategory)?.label ?? skill.skillCategory}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{skill.proficiencyLevel}</Badge>
                        <button
                          onClick={() => selectedUser && deleteSkillMutation.mutate({ userId: selectedUser.id, skillId: skill.id })}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-skill-${skill.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Skill Form */}
              <div className="border rounded-md p-3 space-y-3">
                <p className="text-sm font-medium">Add Skill</p>
                <form onSubmit={handleAddSkill} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="skillName">Skill Name</Label>
                    <Input
                      id="skillName"
                      placeholder="e.g. HVAC repair, Electrical wiring"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      data-testid="input-skill-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Category</Label>
                      <Select value={newSkillCategory} onValueChange={setNewSkillCategory}>
                        <SelectTrigger data-testid="select-skill-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_CATEGORIES.map((c) => (
                            <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Level</Label>
                      <Select value={newSkillLevel} onValueChange={setNewSkillLevel}>
                        <SelectTrigger data-testid="select-skill-level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVELS.map((l) => (
                            <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newSkillName.trim() || addSkillMutation.isPending}
                    data-testid="button-add-skill"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {addSkillMutation.isPending ? "Adding..." : "Add Skill"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isPendingReviewOpen} onOpenChange={(open) => {
        setIsPendingReviewOpen(open);
        if (!open) {
          setSelectedPendingUser(null);
          setIsDenyMode(false);
          setDenyReason("");
          setIsEditingPending(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingPending ? "Edit Access Request" : "Review Access Request"}</DialogTitle>
            <DialogDescription>
              {isEditingPending ? "Modify the request details before approving" : "Review the details and approve or deny this request"}
            </DialogDescription>
          </DialogHeader>
          {selectedPendingUser && !isEditingPending && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Name</span>
                  <p className="font-medium" data-testid="text-pending-name">{selectedPendingUser.firstName} {selectedPendingUser.lastName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Username</span>
                  <p className="font-medium" data-testid="text-pending-username">{selectedPendingUser.username}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Email</span>
                  <p className="font-medium" data-testid="text-pending-email">{selectedPendingUser.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Phone</span>
                  <p className="font-medium">{selectedPendingUser.phoneNumber || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Requested Role</span>
                  <p className="font-medium capitalize" data-testid="text-pending-role">{selectedPendingUser.requestedRole}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Property</span>
                  <p className="font-medium">{selectedPendingUser.requestedProperty || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Submitted</span>
                  <p className="font-medium">{selectedPendingUser.submittedAt ? new Date(selectedPendingUser.submittedAt).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Expires</span>
                  <p className="font-medium">{selectedPendingUser.expiresAt ? new Date(selectedPendingUser.expiresAt).toLocaleDateString() : "—"}</p>
                </div>
              </div>

              {isDenyMode && (
                <div className="space-y-2">
                  <Label htmlFor="denyReason" className="text-sm">Reason for denial (optional)</Label>
                  <Input
                    id="denyReason"
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Briefly explain why..."
                    data-testid="input-deny-reason"
                  />
                </div>
              )}

              <DialogFooter className="gap-2">
                {!isDenyMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditPendingData({
                          firstName: selectedPendingUser.firstName || "",
                          lastName: selectedPendingUser.lastName || "",
                          email: selectedPendingUser.email || "",
                          phoneNumber: selectedPendingUser.phoneNumber || "",
                          requestedRole: selectedPendingUser.requestedRole || "staff",
                          requestedProperty: selectedPendingUser.requestedProperty || "",
                        });
                        setIsEditingPending(true);
                      }}
                      data-testid="button-edit-pending"
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsDenyMode(true)}
                      data-testid="button-deny-pending"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Deny
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(selectedPendingUser.id)}
                      disabled={approveMutation.isPending}
                      data-testid="button-approve-pending"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {approveMutation.isPending ? "Approving..." : "Approve"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsDenyMode(false)}
                      data-testid="button-cancel-deny"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => denyMutation.mutate({ id: selectedPendingUser.id, reason: denyReason })}
                      disabled={denyMutation.isPending}
                      data-testid="button-confirm-deny"
                    >
                      {denyMutation.isPending ? "Denying..." : "Confirm Deny"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
          {selectedPendingUser && isEditingPending && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">First Name</Label>
                  <Input
                    value={editPendingData.firstName}
                    onChange={(e) => setEditPendingData((prev) => ({ ...prev, firstName: e.target.value }))}
                    data-testid="input-edit-pending-first-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Last Name</Label>
                  <Input
                    value={editPendingData.lastName}
                    onChange={(e) => setEditPendingData((prev) => ({ ...prev, lastName: e.target.value }))}
                    data-testid="input-edit-pending-last-name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  value={editPendingData.email}
                  onChange={(e) => setEditPendingData((prev) => ({ ...prev, email: e.target.value }))}
                  data-testid="input-edit-pending-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={editPendingData.phoneNumber}
                  onChange={(e) => setEditPendingData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  data-testid="input-edit-pending-phone"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Role</Label>
                  <Select
                    value={editPendingData.requestedRole}
                    onValueChange={(v) => setEditPendingData((prev) => ({ ...prev, requestedRole: v }))}
                  >
                    <SelectTrigger data-testid="select-edit-pending-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Property</Label>
                  <Input
                    value={editPendingData.requestedProperty}
                    onChange={(e) => setEditPendingData((prev) => ({ ...prev, requestedProperty: e.target.value }))}
                    data-testid="input-edit-pending-property"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditingPending(false)}
                  data-testid="button-cancel-edit-pending"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updatePendingMutation.mutate({ id: selectedPendingUser.id, data: editPendingData })}
                  disabled={updatePendingMutation.isPending}
                  data-testid="button-save-edit-pending"
                >
                  {updatePendingMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
