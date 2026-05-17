import { Fragment, type ReactNode } from "react";
import type { Task } from "@shared/schema";
import { DaySeparator, flattenDayGroups } from "./helpers";

type DayGroup = { label: string; dateKey: string; tasks: Task[] };

interface FieldWorkActiveListProps {
  groups: DayGroup[];
  renderCard: (task: Task, globalIndex: number) => ReactNode;
}

/** Renders day separators once and continuous task numbers across groups. */
export function FieldWorkActiveList({ groups, renderCard }: FieldWorkActiveListProps) {
  const flat = flattenDayGroups(groups);
  if (flat.length === 0) return null;

  let lastDateKey = "";

  return (
    <div className="space-y-3" data-testid="field-work-active-list">
      {flat.map(({ group, task, globalIndex }) => {
        const showSeparator = group.dateKey !== lastDateKey;
        lastDateKey = group.dateKey;
        return (
          <Fragment key={task.id}>
            {showSeparator && <DaySeparator label={group.label} />}
            {renderCard(task, globalIndex)}
          </Fragment>
        );
      })}
    </div>
  );
}
