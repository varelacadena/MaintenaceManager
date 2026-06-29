import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { hasTechPermission, type TechPermissionKey } from "@shared/techPermissions";

type UserRole = "admin" | "staff" | "student" | "technician";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  /** When set, technicians must also have this permission (admins always pass). */
  permission?: TechPermissionKey;
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, permission, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/" />;
  }

  const roleAllowed = allowedRoles.includes(user.role as UserRole);
  if (!roleAllowed) {
    return <Redirect to="/" />;
  }

  if (permission && user.role === "technician" && !hasTechPermission(user, permission)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
