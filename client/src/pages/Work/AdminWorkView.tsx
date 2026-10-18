import { CreateProjectDialog } from "./CreateProjectDialog";
import { WorkLoadError } from "./WorkLoadError";
import { AdminWorkList } from "./AdminWorkList";
import type { WorkContext } from "./useWorkAdmin";

export function AdminWorkView({ ctx }: { ctx: WorkContext }) {
  const { tasksError, tasksErrorMessage, refetchTasks, projectDialogOpen, setProjectDialogOpen, properties } = ctx;

  return (
    <>
      {tasksError ? (
        <div className="px-4 pt-4 md:px-6">
          <WorkLoadError
            title="Couldn't load tasks"
            message={tasksErrorMessage}
            onRetry={() => refetchTasks()}
          />
        </div>
      ) : null}
      <AdminWorkList ctx={ctx} />
      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        properties={properties}
      />
    </>
  );
}
