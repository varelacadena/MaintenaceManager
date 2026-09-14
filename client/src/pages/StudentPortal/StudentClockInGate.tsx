import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatUserDisplayName } from "@shared/displayNames";
import { studentPortalQueryKeys, useStudentTimeClock } from "./studentPortalApi";

type TechnicianOption = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  role: string;
};

interface StudentClockInGateProps {
  enabled: boolean;
}

export function StudentClockInGate({ enabled }: StudentClockInGateProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const skipGate = location.startsWith("/settings") || location.startsWith("/hours");
  const clockQuery = useStudentTimeClock(enabled);
  const [supervisorId, setSupervisorId] = useState("");

  const techniciansQuery = useQuery<TechnicianOption[]>({
    queryKey: ["/api/users/directory", { role: "technician" }],
    enabled: enabled && !skipGate,
    queryFn: async () => {
      const response = await fetch("/api/users/directory?role=technician", { credentials: "include" });
      if (!response.ok) throw new Error("Could not load technicians");
      return response.json();
    },
    staleTime: 60_000,
  });

  const technicians = useMemo(
    () =>
      (techniciansQuery.data ?? [])
        .filter((user) => user.role === "technician")
        .slice()
        .sort((a, b) => formatUserDisplayName(a).localeCompare(formatUserDisplayName(b))),
    [techniciansQuery.data],
  );

  useEffect(() => {
    if (supervisorId) return;
    const lastId = clockQuery.data?.lastSupervisorId;
    if (lastId && technicians.some((tech) => tech.id === lastId)) {
      setSupervisorId(lastId);
    }
  }, [clockQuery.data?.lastSupervisorId, supervisorId, technicians]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/student/time-clock/clock-in", { supervisorId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.timeClock });
      queryClient.invalidateQueries({ queryKey: studentPortalQueryKeys.adminList });
      toast({ title: "You're clocked in", description: "Have a good shift." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not clock in", description: error.message, variant: "destructive" });
    },
  });

  if (!enabled || skipGate || clockQuery.data?.openEntry) {
    return null;
  }

  const isReady = !clockQuery.isLoading;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      data-testid="student-clock-in-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-clock-in-title"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <LogIn className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 id="student-clock-in-title" className="text-lg font-semibold tracking-tight">
              Clock in to start
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select your supervisor, then clock in.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-supervisor" className="text-sm font-medium">
            Supervisor
          </Label>
          {!isReady || techniciansQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading technicians…</p>
          ) : technicians.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No technicians are available yet. Ask an admin to add one, then try again.
            </p>
          ) : (
            <select
              id="student-supervisor"
              value={supervisorId}
              onChange={(event) => setSupervisorId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="select-supervisor"
            >
              <option value="">Choose a technician</option>
              {technicians.map((tech) => (
                <option
                  key={tech.id}
                  value={tech.id}
                  data-testid={`button-supervisor-${tech.id}`}
                >
                  {formatUserDisplayName(tech)}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button
          type="button"
          className="w-full h-11"
          disabled={!supervisorId || clockInMutation.isPending || technicians.length === 0}
          onClick={() => clockInMutation.mutate()}
          data-testid="button-clock-in"
        >
          {clockInMutation.isPending ? "Clocking in…" : "Clock in"}
        </Button>

        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/hours")}
            data-testid="link-clock-in-hours"
          >
            Hours
          </button>
          <span className="text-border">·</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/settings")}
            data-testid="link-clock-in-settings"
          >
            Settings
          </button>
          <span className="text-border">·</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/";
            }}
            data-testid="button-clock-in-sign-out"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
