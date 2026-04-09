import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, X, Bot, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAY_NAMES, SKILL_CATEGORIES, SKILL_LEVELS } from './useUsers';
import type { UsersContext } from './useUsers';
import { TimeSelect } from './TimeSelect';

export function UserDialogs({ ctx }: { ctx: UsersContext }) {
  const {
    isCreateDialogOpen, setIsCreateDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    isPasswordDialogOpen, setIsPasswordDialogOpen,
    isProfileDialogOpen, setIsProfileDialogOpen,
    isAiProfileDialogOpen, setIsAiProfileDialogOpen,
    selectedUser,
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
    userSkills,
    approveMutation,
    denyMutation,
    updatePendingMutation,
    createUserMutation,
    updateUserMutation,
    updatePasswordMutation,
    deleteSkillMutation,
    saveAvailabilityMutation,
    addSkillMutation,
    handleSaveAvailability,
    handleAddSkill,
    handleCreateUser,
    handleUpdateUser,
    handleUpdatePassword,
    getRoleBadgeColor,
  } = ctx;

  return (
    <>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
    </>
  );
}
