import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { toCalendarDate } from "@/lib/taskCalendarDates";
import { format } from "date-fns";

interface ManualTimeLogFieldsProps {
  hours: string;
  minutes: string;
  date: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onDateChange: (value: string) => void;
  idPrefix?: string;
  showDate?: boolean;
}

export function ManualTimeLogFields({
  hours,
  minutes,
  date,
  onHoursChange,
  onMinutesChange,
  onDateChange,
  idPrefix = "log-time",
  showDate = true,
}: ManualTimeLogFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-hours`}>Hours</Label>
        <Input
          id={`${idPrefix}-hours`}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="0"
          value={hours}
          onChange={(event) => onHoursChange(event.target.value)}
          data-testid={`${idPrefix}-hours`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-minutes`}>Minutes</Label>
        <Input
          id={`${idPrefix}-minutes`}
          type="number"
          min={0}
          max={59}
          step={1}
          inputMode="numeric"
          placeholder="0"
          value={minutes}
          onChange={(event) => onMinutesChange(event.target.value)}
          data-testid={`${idPrefix}-minutes`}
        />
      </div>
      {showDate && (
        <div className="space-y-1.5 col-span-2">
          <Label>Worked on</Label>
          <DatePicker
            value={date ? toCalendarDate(date) ?? undefined : undefined}
            onChange={(next) => onDateChange(next ? format(next, "yyyy-MM-dd") : "")}
            placeholder="Pick date"
            data-testid={`${idPrefix}-date`}
          />
        </div>
      )}
    </div>
  );
}
