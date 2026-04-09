import { Skeleton } from "@/components/ui/skeleton";
import { useWork } from "./useWork";
import { StudentWorkView } from "./StudentWorkView";
import { TechnicianWorkView } from "./TechnicianWorkView";
import { AdminWorkView } from "./AdminWorkView";

export default function Work() {
  const ctx = useWork();

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

  if (ctx.user?.role === "student") {
    return (
      <StudentWorkView
        user={ctx.user}
        tasks={ctx.tasks || []}
        properties={ctx.properties}
        navigate={ctx.navigate}
      />
    );
  }

  if (ctx.user?.role === "technician") {
    return (
      <TechnicianWorkView
        user={ctx.user}
        tasks={ctx.tasks || []}
        properties={ctx.properties}
        navigate={ctx.navigate}
      />
    );
  }

  return <AdminWorkView ctx={ctx} />;
}
