import { useEffect } from "react";
import { useLocation } from "wouter";
import { StudentClockOutDialog } from "./StudentClockOutDialog";
import { useStudentTimeClock } from "./studentPortalApi";

export default function StudentClockOut() {
  const [, navigate] = useLocation();
  const clockQuery = useStudentTimeClock(true);

  useEffect(() => {
    if (!clockQuery.isLoading && !clockQuery.data?.openEntry) {
      navigate("/work", { replace: true });
    }
  }, [clockQuery.data?.openEntry, clockQuery.isLoading, navigate]);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" data-testid="student-clock-out-page">
      <StudentClockOutDialog
        open={Boolean(clockQuery.data?.openEntry)}
        onOpenChange={(open) => {
          if (!open) navigate("/work", { replace: true });
        }}
        onClockedOut={() => navigate("/work", { replace: true })}
      />
    </div>
  );
}
