import { useMobileTaskDetail } from "./useMobileTaskDetail";
import { TaskEditMode } from "../TaskEditMode";
import { MobileTaskHeader, MobileStatusBar } from "./MobileTaskHeader";
import { MobileTaskContent } from "./MobileTaskContent";
import { MobileTaskContentExtra } from "./MobileTaskContentExtra";
import { MobileTaskDialogs } from "./MobileTaskDialogs";
import { MobileTaskDialogsExtra } from "./MobileTaskDialogsExtra";

export default function MobileTaskDetail() {
  const ctx = useMobileTaskDetail();

  const {
    id, navigate, task, isLoading, subtasks,
    isEditMode, setIsEditMode,
  } = ctx;

  if (isLoading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8F8F8" }}>
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="h-10 rounded" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-64 rounded" style={{ backgroundColor: "#EEEEEE" }} />
          <div className="h-48 rounded" style={{ backgroundColor: "#EEEEEE" }} />
        </div>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="flex flex-col min-h-screen" data-testid="mobile-task-detail">
        <TaskEditMode
          taskId={id!}
          task={task}
          subtasks={subtasks || []}
          onCancel={() => setIsEditMode(false)}
          onSaved={() => setIsEditMode(false)}
          onDeleted={() => navigate("/work")}
          variant="mobile"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#F8F8F8" }} data-testid="mobile-task-detail">
      <MobileTaskHeader task={task} navigate={navigate} />

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-3">
        <MobileStatusBar task={task} />
        <MobileTaskContent ctx={ctx} />
        <MobileTaskContentExtra ctx={ctx} />
      </div>

      <MobileTaskDialogs ctx={ctx} />
      <MobileTaskDialogsExtra ctx={ctx} />
    </div>
  );
}
