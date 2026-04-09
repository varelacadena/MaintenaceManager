import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, UserPlus, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsers } from './useUsers';
import { UserDialogs } from './UserDialogs';
import { UserDialogsExtra } from './UserDialogsExtra';
import { UsersTabContent, PendingTabContent, CredentialsTabContent } from './UserTable';

export default function Users() {
  const ctx = useUsers();
  const { isLoading, users, pendingUsers, setIsCreateDialogOpen } = ctx;

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
        <Button className="w-full sm:w-auto" data-testid="button-create-user" onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </Button>
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
            {pendingUsers.filter((p) => p.status === "pending").length > 0 && (
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white px-1" data-testid="badge-pending-count">
                {pendingUsers.filter((p) => p.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="credentials" data-testid="tab-credentials">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTabContent ctx={ctx} />
        </TabsContent>

        <TabsContent value="pending">
          <PendingTabContent ctx={ctx} />
        </TabsContent>

        <TabsContent value="credentials">
          <CredentialsTabContent ctx={ctx} />
        </TabsContent>
      </Tabs>

      <UserDialogs ctx={ctx} />
      <UserDialogsExtra ctx={ctx} />
    </div>
  );
}
