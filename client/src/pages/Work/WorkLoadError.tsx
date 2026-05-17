import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface WorkLoadErrorProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function WorkLoadError({ title, message, onRetry }: WorkLoadErrorProps) {
  return (
    <Alert variant="destructive" data-testid="work-load-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="w-fit shrink-0"
            onClick={onRetry}
            data-testid="button-retry-work-load"
          >
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
