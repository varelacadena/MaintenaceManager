import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOURS, MINUTES, hhmmToTimeParts, timePartsToHhmm } from "./useUsers";

export function TimeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { hour, minute, period } = hhmmToTimeParts(value);
  const update = (h: string, m: string, p: string) => onChange(timePartsToHhmm(h, m, p));
  return (
    <div className="flex items-center gap-1">
      <Select value={hour} onValueChange={(h) => update(h, minute, period)} disabled={disabled}>
        <SelectTrigger className="w-16 h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-xs">:</span>
      <Select value={minute} onValueChange={(m) => update(hour, m, period)} disabled={disabled}>
        <SelectTrigger className="w-16 h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(p) => update(hour, minute, p)} disabled={disabled}>
        <SelectTrigger className="w-16 h-8 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
