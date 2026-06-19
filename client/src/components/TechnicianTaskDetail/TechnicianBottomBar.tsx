import {
  Play,
  Pause,
  Check,
  Camera,
  QrCode,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Task } from "@shared/schema";

interface TechnicianBottomBarProps {
  task: Task;
  taskStarted: boolean;
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
  taskStarted,
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ padding: "8px 12px calc(14px + env(safe-area-inset-bottom, 0px))" }}
      data-testid="tech-bottom-bar"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 max-w-lg mx-auto">
        <button
          className="flex items-center justify-center shrink-0 border border-border rounded-[10px]"
          style={{ width: 42, height: 42 }}
          onClick={() => setIsScanEquipmentOpen(true)}
          disabled={isEquipmentLoading}
          data-testid="bottom-button-scan"
        >
          <QrCode className="w-5 h-5 text-muted-foreground" />
        </button>

        {task.status === "completed" ? (
          <div className="min-w-0 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-green-700">
            <Check className="w-4 h-4" />
            <span className="truncate">Completed</span>
          </div>
        ) : !taskStarted ? (
          <button
            className="min-w-0 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-primary transition-colors"
            onClick={handleStartTask}
            disabled={startTimerMutation.isPending}
            data-testid="bottom-button-start"
          >
            <Play className="w-4 h-4" />
            <span className="truncate">Start Task</span>
          </button>
        ) : timerRunning ? (
          <button
            className="min-w-0 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-gray-600 dark:bg-gray-500 transition-colors"
            onClick={handlePauseTap}
            disabled={isBusy}
            data-testid="bottom-button-pause"
          >
            <Pause className="w-4 h-4" />
            <span className="truncate">Pause</span>
          </button>
        ) : (
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <button
              className="min-w-0 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-primary transition-colors"
              onClick={handleResume}
              disabled={startTimerMutation.isPending || isBusy}
              data-testid="bottom-button-resume"
            >
              <Play className="w-4 h-4" />
              <span className="truncate">Resume</span>
            </button>
            <button
              className="min-w-0 flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium text-sm bg-green-700 dark:bg-green-600 transition-colors"
              onClick={handleFinishTap}
              disabled={isBusy}
              data-testid="bottom-button-finish"
            >
              <Check className="w-4 h-4" />
              <span className="truncate">Finish</span>
            </button>
          </div>
        )}

        <div
          style={{
            opacity: taskStarted ? 1 : 0.35,
            pointerEvents: taskStarted ? "auto" : "none",
          }}
        >
          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={10485760}
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
            buttonClassName="flex items-center justify-center"
            buttonTestId="bottom-button-camera"
            isLoading={addUploadMutation.isPending}
          >
            <div
              className={`flex items-center justify-center rounded-[10px] ${taskStarted ? "border-primary bg-primary/10" : "border-border"}`}
              style={{ width: 42, height: 42, borderWidth: 1, borderStyle: "solid" }}
            >
              <Camera
                className={`w-5 h-5 ${taskStarted ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
          </ObjectUploader>
        </div>
      </div>
    </div>
  );
}
