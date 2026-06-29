import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TECH_PERMISSION_LABELS, type TechPermissionKey } from "@shared/techPermissions";
import type { UsersContext } from "./useUsers";
import { formatUserDisplayName } from "@/lib/displayNames";

const PERMISSION_KEYS: TechPermissionKey[] = ["equipment", "fleet", "inventory"];

export function PermissionsTabContent({ ctx }: { ctx: UsersContext }) {
  const { users, updatePermissionsMutation, getRoleBadgeColor } = ctx;
  const technicians = users.filter((u) => u.role === "technician");

  if (technicians.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-base md:text-lg">Technician Permissions</CardTitle>
          <CardDescription>
            Grant technicians the ability to add and edit equipment, fleet, or inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <p className="text-sm text-muted-foreground" data-testid="text-no-technicians">
            No technician accounts yet. Create or approve a technician to manage permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 md:p-4">
        <CardTitle className="text-base md:text-lg">Technician Permissions</CardTitle>
        <CardDescription>
          Enable or disable add/edit access for each technician. Admins always have full access.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-0 space-y-4">
        {technicians.map((user) => {
          const initials =
            user.firstName && user.lastName
              ? `${user.firstName[0]}${user.lastName[0]}`
              : user.username?.[0]?.toUpperCase() || "T";

          return (
            <div
              key={user.id}
              className="rounded-lg border p-3 md:p-4 space-y-4"
              data-testid={`permissions-${user.id}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{formatUserDisplayName(user)}</span>
                    <Badge className={`${getRoleBadgeColor(user.role)} no-default-hover-elevate text-xs`}>
                      Technician
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email || user.username}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {PERMISSION_KEYS.map((key) => {
                  const { title, description } = TECH_PERMISSION_LABELS[key];
                  const field =
                    key === "equipment"
                      ? "canManageEquipment"
                      : key === "fleet"
                        ? "canManageFleet"
                        : "canManageInventory";
                  const checked = !!user[field];

                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-3 rounded-md border p-3"
                      data-testid={`permission-${key}-${user.id}`}
                    >
                      <div className="space-y-1">
                        <Label htmlFor={`${key}-${user.id}`} className="text-sm font-medium">
                          {title}
                        </Label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <Switch
                        id={`${key}-${user.id}`}
                        checked={checked}
                        disabled={updatePermissionsMutation.isPending}
                        onCheckedChange={(enabled) =>
                          updatePermissionsMutation.mutate({
                            userId: user.id,
                            permissions: { [field]: enabled },
                          })
                        }
                        data-testid={`switch-${key}-${user.id}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
