import {
  Play,
  Pause,
  Check,
  Camera,
  QrCode,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import type { Task } from "@shared/schema";

const iconButtonClass = "h-12 w-12 sm:h-12 sm:w-12 shrink-0 rounded-lg p-0 [&_svg]:!size-5";
const actionButtonClass =
  "h-12 min-w-0 flex-1 flex items-center justify-center gap-2 rounded-lg px-3 text-base font-medium text-white";

interface TechnicianBottomBarProps {
  task: Task;
  isPaused: boolean;
  activeTimer: string | null;
  isEquipmentLoading: boolean;
  startTimerMutation: any;
  stopTimerMutation: any;
  addUploadMutation: any;
  setIsScanEquipmentOpen: (v: boolean) => void;
  handleStartTask: () => void;
  handleResume: () => void;
  handlePauseTap: () => void;
  handleFinishTap: () => void;
  getUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  handleAutoSaveUpload: (result: any) => void;
  toast: any;
}

export function TechnicianBottomBar({
  task,
  isPaused,
  activeTimer,
  isEquipmentLoading,
  startTimerMutation,
  stopTimerMutation,
  addUploadMutation,
  setIsScanEquipmentOpen,
  handleStartTask,
  handleResume,
  handlePauseTap,
  handleFinishTap,
  getUploadParameters,
  handleAutoSaveUpload,
  toast,
}: TechnicianBottomBarProps) {
  const isBusy = stopTimerMutation.isPending;
  const timerRunning = !!activeTimer && !isPaused;

  return (
    <div
      className="shrink-0 z-30 border-t border-border bg-background"
      style={{ padding: "8px 12px calc(10px + env(safe-area-inset-bottom, 0px))" }}
      data-testid="tech-bottom-bar"
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch gap-2">
        <Button
          type="button"
          variant="outline"
          className={iconButtonClass}
          onClick={() => setIsScanEquipmentOpen(true)}
          disabled={isEquipmentLoading}
          aria-label="Scan equipment"
          data-testid="bottom-button-scan"
        >
          <QrCode className="text-muted-foreground" />
        </Button>

        {task.status === "completed" ? (
          <div className={`${actionButtonClass} bg-green-700`}>
            <Check className="size-5 shrink-0" />
            <span className="truncate">Completed</span>
          </div>
        ) : task.status === "needs_estimate" || task.status === "waiting_approval" ? (
          <div
            className={`${actionButtonClass} bg-muted-foreground`}
            data-testid="bottom-button-estimate-required"
          >
            <span className="truncate">Estimate Required</span>
          </div>
        ) : task.status === "not_started" ? (
          <button
            className={`${actionButtonClass} bg-primary transition-colors`}
            onClick={handleStartTask}
            disabled={startTimerMutation.isPending}
            data-testid="bottom-button-start"
          >
            <Play className="size-5 shrink-0" />
            <span className="truncate">Start Task</span>
          </button>
        ) : timerRunning ? (
          <button
            className={`${actionButtonClass} bg-gray-600 transition-colors dark:bg-gray-500`}
            onClick={handlePauseTap}
            disabled={isBusy}
            data-testid="bottom-button-pause"
          >
            <Pause className="size-5 shrink-0" />
            <span className="truncate">Pause</span>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-stretch gap-2">
            <button
              className={`${actionButtonClass} bg-primary transition-colors`}
              onClick={handleResume}
              disabled={startTimerMutation.isPending || isBusy}
              data-testid="bottom-button-resume"
            >
              <Play className="size-5 shrink-0" />
              <span className="truncate">Resume</span>
            </button>
            <button
              className={`${actionButtonClass} bg-green-700 transition-colors dark:bg-green-600`}
              onClick={handleFinishTap}
              disabled={isBusy}
              data-testid="bottom-button-finish"
            >
              <Check className="size-5 shrink-0" />
              <span className="truncate">Finish</span>
            </button>
          </div>
        )}

        <ObjectUploader
          maxNumberOfFiles={5}
          maxFileSize={10485760}
          accept="image/*"
          onGetUploadParameters={getUploadParameters}
          onComplete={handleAutoSaveUpload}
          onError={(error) => {
            toast({
              title: "Upload failed",
              description: error.message,
              variant: "destructive",
            });
          }}
          buttonVariant="outline"
          wrapperClassName="h-12 w-12 sm:h-12 sm:w-12 shrink-0"
          buttonClassName={iconButtonClass}
          buttonTestId="bottom-button-camera"
          buttonAriaLabel="Add photo"
          isLoading={addUploadMutation.isPending}
        >
          <Camera className="text-primary" />
        </ObjectUploader>
      </div>
    </div>
  );
}
