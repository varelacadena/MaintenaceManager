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
import { Mail, Edit, Trash2, User as UserIcon, Lock, Bot, CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UsersContext } from './useUsers';

export function UsersTabContent({ ctx }: { ctx: UsersContext }) {
  const { users, updateRoleMutation, openAiProfileDialog, getRoleBadgeColor, getRoleLabel } = ctx;

  return (
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
  );
}

export function PendingTabContent({ ctx }: { ctx: UsersContext }) {
  const {
    isPendingLoading, pendingUsers,
    setIsPendingReviewOpen, setSelectedPendingUser, setIsDenyMode, setDenyReason,
    approveMutation, deletePendingMutation,
  } = ctx;

  return (
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
            {pendingUsers.map((pu) => {
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
                : pu.status === "pending"
                ? "border-amber-400 dark:border-amber-600 border-2"
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
                      <Badge variant="outline" className="text-xs">{pu.requestedRole}</Badge>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[pu.status] || ""}`}>
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
  );
}

export function CredentialsTabContent({ ctx }: { ctx: UsersContext }) {
  const {
    users, updateRoleMutation, getRoleBadgeColor,
    openProfileDialog, openAiProfileDialog, openEditDialog, openPasswordDialog, handleDeleteUser,
  } = ctx;

  return (
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
  );
}
