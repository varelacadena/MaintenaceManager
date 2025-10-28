import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wrench, ClipboardList, Clock, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary">
              <Wrench className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-semibold">Maintenance Management</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your college maintenance operations with our comprehensive platform for managing service requests, tracking tasks, and organizing maintenance across all facilities.
          </p>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => (window.location.href = "/api/login")}
              data-testid="button-login"
            >
              Sign In to Get Started
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 w-fit">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Service Requests</h3>
            <p className="text-sm text-muted-foreground">
              Submit and track maintenance requests with priority levels, categories, and real-time status updates.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 w-fit">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Task Management</h3>
            <p className="text-sm text-muted-foreground">
              Track work time, log parts used, upload photos and invoices, and manage task status with ease.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 w-fit">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Team Communication</h3>
            <p className="text-sm text-muted-foreground">
              Built-in messaging portal for seamless communication between college staff and maintenance teams.
            </p>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Role-Based Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-medium mb-2">Admin Maintenance</h3>
              <p className="text-sm text-muted-foreground">
                Full oversight, user management, and area organization
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-medium mb-2">Maintenance Staff</h3>
              <p className="text-sm text-muted-foreground">
                Task management, time tracking, and documentation
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-medium mb-2">College Staff</h3>
              <p className="text-sm text-muted-foreground">
                Submit requests and communicate with maintenance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
