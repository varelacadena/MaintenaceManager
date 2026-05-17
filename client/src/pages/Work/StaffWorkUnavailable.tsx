import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export function StaffWorkUnavailable() {
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto text-center space-y-4" data-testid="staff-work-unavailable">
      <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50" />
      <div className="space-y-2">
        <h1 className="text-xl font-bold" data-testid="text-staff-work-title">
          Work tasks aren&apos;t available
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account can submit and track service requests, but task management is limited to admins,
          technicians, and students.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link href="/requests">
          <Button data-testid="button-staff-go-requests">My Requests</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" data-testid="button-staff-go-dashboard">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
