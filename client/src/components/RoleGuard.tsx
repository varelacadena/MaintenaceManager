import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";

type UserRole = "admin" | "staff" | "student" | "technician";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/" />;
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
