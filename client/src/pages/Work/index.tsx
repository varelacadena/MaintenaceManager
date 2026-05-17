import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { StudentWorkView } from "./StudentWorkView";
import { TechnicianWorkView } from "./TechnicianWorkView";
import { AdminWorkView } from "./AdminWorkView";
import { StaffWorkUnavailable } from "./StaffWorkUnavailable";
import { WorkLoadError } from "./WorkLoadError";
import { useWorkField } from "./useWorkField";
import { useWorkAdmin } from "./useWorkAdmin";

function WorkFieldLoading() {
  return (
    <div className="p-3 md:p-4 space-y-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function WorkFieldShell({
  children,
  ctx,
}: {
  children: ReactNode;
  ctx: ReturnType<typeof useWorkField>;
}) {
  if (ctx.isLoading) {
    return <WorkFieldLoading />;
  }

  return (
    <div className="space-y-4">
      {ctx.tasksError && (
        <div className="px-4 pt-4">
          <WorkLoadError
            title="Couldn't load your tasks"
            message={ctx.tasksErrorMessage}
            onRetry={() => ctx.refetchTasks()}
          />
        </div>
      )}
      {!ctx.tasksError && children}
    </div>
  );
}

function WorkStudentPage() {
  const ctx = useWorkField();
  if (!ctx.user || ctx.user.role !== "student") return null;

  return (
    <WorkFieldShell ctx={ctx}>
      <StudentWorkView
        user={ctx.user}
        tasks={ctx.tasks || []}
        properties={ctx.properties}
        navigate={ctx.navigate}
      />
    </WorkFieldShell>
  );
}

function WorkTechnicianPage() {
  const ctx = useWorkField();
  if (!ctx.user || ctx.user.role !== "technician") return null;

  return (
    <WorkFieldShell ctx={ctx}>
      <TechnicianWorkView
        user={ctx.user}
        tasks={ctx.tasks || []}
        properties={ctx.properties}
        navigate={ctx.navigate}
      />
    </WorkFieldShell>
  );
}

function WorkAdminPage() {
  const ctx = useWorkAdmin();

  if (ctx.isLoading) {
    return (
      <div className="p-3 md:p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <AdminWorkView ctx={ctx} />;
}

export default function Work() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "staff") {
    return <StaffWorkUnavailable />;
  }

  if (role === "student") {
    return <WorkStudentPage />;
  }

  if (role === "technician") {
    return <WorkTechnicianPage />;
  }

  return <WorkAdminPage />;
}
