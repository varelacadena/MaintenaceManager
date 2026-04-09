import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, PendingUser } from "@shared/schema";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const SKILL_CATEGORIES = [
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
export const SKILL_LEVELS = ["basic", "intermediate", "advanced"] as const;

export const HOURS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
export const MINUTES = ["00","15","30","45"];

export function hhmmToTimeParts(hhmm: string): { hour: string; minute: string; period: string } {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const minute = MINUTES.includes(mStr) ? mStr : "00";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const hour = String(hour12).padStart(2, "0");
  return { hour, minute, period };
}

export function timePartsToHhmm(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

export function getRoleBadgeColor(role: string) {
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
}

export function getRoleLabel(role: string) {
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
}

export function useUsers() {
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
  const [selectedPendingUser, setSelectedPendingUser] = useState<PendingUser | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [isDenyMode, setIsDenyMode] = useState(false);
  const [isEditingPending, setIsEditingPending] = useState(false);
  const [editPendingData, setEditPendingData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    requestedRole: "",
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: pendingUsers = [], isLoading: isPendingLoading } = useQuery<PendingUser[]>({
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<PendingUser, "firstName" | "lastName" | "email" | "phoneNumber" | "requestedRole">> }) => {
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

  return {
    toast,
    queryClient,
    isLoading,
    isPendingLoading,
    users,
    pendingUsers,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    isPasswordDialogOpen, setIsPasswordDialogOpen,
    isProfileDialogOpen, setIsProfileDialogOpen,
    isAiProfileDialogOpen, setIsAiProfileDialogOpen,
    selectedUser, setSelectedUser,
    newSkillName, setNewSkillName,
    newSkillCategory, setNewSkillCategory,
    newSkillLevel, setNewSkillLevel,
    newUsername, setNewUsername,
    newPassword, setNewPassword,
    newEmail, setNewEmail,
    newPhoneNumber, setNewPhoneNumber,
    newFirstName, setNewFirstName,
    newLastName, setNewLastName,
    newRole, setNewRole,
    editUsername, setEditUsername,
    editEmail, setEditEmail,
    editPhoneNumber, setEditPhoneNumber,
    editFirstName, setEditFirstName,
    editLastName, setEditLastName,
    editPassword, setEditPassword,
    isPendingReviewOpen, setIsPendingReviewOpen,
    selectedPendingUser, setSelectedPendingUser,
    denyReason, setDenyReason,
    isDenyMode, setIsDenyMode,
    isEditingPending, setIsEditingPending,
    editPendingData, setEditPendingData,
    localSchedule, setLocalSchedule,
    userAvailability,
    userSkills,
    approveMutation,
    denyMutation,
    updatePendingMutation,
    deletePendingMutation,
    createUserMutation,
    updateRoleMutation,
    updateUserMutation,
    updatePasswordMutation,
    deleteUserMutation,
    saveAvailabilityMutation,
    addSkillMutation,
    deleteSkillMutation,
    openAiProfileDialog,
    handleSaveAvailability,
    handleAddSkill,
    resetCreateForm,
    handleCreateUser,
    handleUpdateUser,
    handleUpdatePassword,
    handleDeleteUser,
    openEditDialog,
    openPasswordDialog,
    openProfileDialog,
    getRoleBadgeColor,
    getRoleLabel,
  };
}

export type UsersContext = ReturnType<typeof useUsers>;
