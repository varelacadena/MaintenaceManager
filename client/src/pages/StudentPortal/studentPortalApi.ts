import { useQuery } from "@tanstack/react-query";

export interface StudentTimeEntryDto {
  id: string;
  studentId: string | null;
  studentName: string;
  supervisorId: string | null;
  supervisorName: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  durationMinutes: number | null;
  pendingEditRequestId?: string | null;
}

export interface StudentRecapDto {
  id: string;
  studentId: string | null;
  studentName: string;
  timeEntryId: string;
  recapDate: string;
  whatIDid: string;
  whatILearned: string;
  createdAt: string | null;
}

export interface StudentTimeEditRequestDto {
  id: string;
  studentId: string | null;
  studentName: string;
  timeEntryId: string | null;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  originalClockInAt: string | null;
  originalClockOutAt: string | null;
  requestedMinutes: number | null;
  reason: string;
  status: "pending" | "approved" | "denied" | string;
  adminNote: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}

export interface StudentTimeClockStatus {
  openEntry: StudentTimeEntryDto | null;
  lastSupervisorId: string | null;
  lastSupervisorName: string | null;
  todayRecapCount: number;
  weekMinutes?: number;
  weekStartDate?: string;
  weekEndDate?: string;
}

export interface StudentHoursDay {
  date: string;
  label: string;
  minutes: number;
}

export interface StudentHoursResponse {
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  days: StudentHoursDay[];
  entries: StudentTimeEntryDto[];
  editRequests: StudentTimeEditRequestDto[];
}

export function useStudentTimeClock(enabled: boolean) {
  return useQuery<StudentTimeClockStatus>({
    queryKey: ["/api/student/time-clock"],
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useStudentRecaps(enabled: boolean) {
  return useQuery<StudentRecapDto[]>({
    queryKey: ["/api/student/recaps"],
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useStudentHours(enabled: boolean, weekStart?: string) {
  return useQuery<StudentHoursResponse>({
    queryKey: ["/api/student/hours", weekStart ?? ""],
    enabled,
    queryFn: async () => {
      const params = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
      const response = await fetch(`/api/student/hours${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load hours");
      return response.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export const studentPortalQueryKeys = {
  timeClock: ["/api/student/time-clock"] as const,
  recaps: ["/api/student/recaps"] as const,
  hours: ["/api/student/hours"] as const,
  adminList: ["/api/admin/students"] as const,
};
