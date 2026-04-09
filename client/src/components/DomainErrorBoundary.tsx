import { Component, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DomainErrorBoundaryProps {
  domain: string;
  children: ReactNode;
}

interface DomainErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class DomainErrorBoundary extends Component<DomainErrorBoundaryProps, DomainErrorBoundaryState> {
  constructor(props: DomainErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): DomainErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[${this.props.domain}] Error boundary caught:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8" data-testid={`error-boundary-${this.props.domain.toLowerCase().replace(/\s+/g, "-")}`}>
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <h3 className="text-base font-semibold">{this.props.domain}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Something went wrong in this section. The rest of the app is still working.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <Button onClick={() => window.location.reload()} data-testid="button-reload-domain">
              Reload
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
