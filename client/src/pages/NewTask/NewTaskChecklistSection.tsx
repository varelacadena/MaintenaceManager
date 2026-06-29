import type { NewTaskContext } from "./useNewTask";
import { TaskChecklistEditor } from "@/components/task-form/TaskChecklistEditor";

interface NewTaskChecklistSectionProps {
  ctx: NewTaskContext;
}

export function NewTaskChecklistSection({ ctx }: NewTaskChecklistSectionProps) {
  const { checklistGroups, setChecklistGroups } = ctx;

  return (
    <div className="pb-4">
      <TaskChecklistEditor groups={checklistGroups} onChange={setChecklistGroups} />
    </div>
  );
}
