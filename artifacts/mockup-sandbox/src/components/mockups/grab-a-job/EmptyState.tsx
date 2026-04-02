import { Button } from "@/components/ui/button";
import { RefreshCw, Hand, Inbox } from "lucide-react";

export function EmptyState() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Grab a Job</h1>
          </div>
          <Button variant="ghost" size="icon" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          0 jobs available in your pool
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Inbox className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">No jobs available</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          There are no unassigned tasks in your pool right now. Check back later or tap refresh to see if new jobs have been posted.
        </p>
        <Button variant="outline" data-testid="button-refresh-empty">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
