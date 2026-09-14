import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  computeDurationMinutes,
  dateTimeLocalToIso,
  formatDurationMinutes,
} from "@shared/studentPortal";

interface ClockTimeFieldsProps {
  idPrefix: string;
  clockIn: string;
  clockOut: string;
  onClockInChange: (value: string) => void;
  onClockOutChange: (value: string) => void;
  allowOpenShift?: boolean;
}

export function ClockTimeFields({
  idPrefix,
  clockIn,
  clockOut,
  onClockInChange,
  onClockOutChange,
  allowOpenShift = true,
}: ClockTimeFieldsProps) {
  const startIso = dateTimeLocalToIso(clockIn);
  const endIso = dateTimeLocalToIso(clockOut);
  const previewMinutes =
    startIso && endIso
      ? computeDurationMinutes(new Date(startIso), new Date(endIso))
      : startIso && allowOpenShift && !clockOut
        ? computeDurationMinutes(new Date(startIso), new Date())
        : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-clock-in`}>Clock in</Label>
        <Input
          id={`${idPrefix}-clock-in`}
          type="datetime-local"
          value={clockIn}
          onChange={(event) => onClockInChange(event.target.value)}
          data-testid={`${idPrefix}-clock-in`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-clock-out`}>Clock out{allowOpenShift ? " (optional)" : ""}</Label>
        <Input
          id={`${idPrefix}-clock-out`}
          type="datetime-local"
          value={clockOut}
          onChange={(event) => onClockOutChange(event.target.value)}
          data-testid={`${idPrefix}-clock-out`}
        />
      </div>
      {previewMinutes != null && (
        <p className="text-sm text-muted-foreground" data-testid={`${idPrefix}-duration-preview`}>
          Recorded time: <span className="font-medium text-foreground">{formatDurationMinutes(previewMinutes)}</span>
          {!endIso ? " so far" : ""}
        </p>
      )}
    </div>
  );
}
