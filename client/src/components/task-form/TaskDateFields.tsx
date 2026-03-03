import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskDateFieldsProps {
  form: any;
  allowPastDates?: boolean;
}

const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function parseTimeValue(value: string | undefined): { hour: string; minute: string; period: string } {
  if (!value) return { hour: "", minute: "", period: "" };
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  let displayHour = h % 12;
  if (displayHour === 0) displayHour = 12;
  const nearestMinute = MINUTES.reduce((prev, cur) =>
    Math.abs(parseInt(cur) - m) < Math.abs(parseInt(prev) - m) ? cur : prev
  );
  return {
    hour: String(displayHour).padStart(2, "0"),
    minute: nearestMinute,
    period,
  };
}

function buildTimeValue(hour: string, minute: string, period: string): string | undefined {
  if (!hour || !minute || !period) return undefined;
  let h = parseInt(hour, 10);
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${minute}`;
}

function TimeSelect({ field }: { field: any }) {
  const parsed = parseTimeValue(field.value);

  function handleChange(type: "hour" | "minute" | "period", val: string) {
    const next = {
      hour: parsed.hour,
      minute: parsed.minute,
      period: parsed.period,
      [type]: val,
    };
    const result = buildTimeValue(next.hour, next.minute, next.period);
    field.onChange(result);
  }

  return (
    <div className="flex gap-2" data-testid="input-scheduled-time">
      <Select value={parsed.hour} onValueChange={(v) => handleChange("hour", v)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={parsed.minute} onValueChange={(v) => handleChange("minute", v)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={parsed.period} onValueChange={(v) => handleChange("period", v)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TaskDateFields({ form, allowPastDates = false }: TaskDateFieldsProps) {
  const disabledDate = allowPastDates ? undefined : (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="initialDate"
          render={({ field }: { field: any }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(new Date(field.value + 'T12:00:00'), "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        field.onChange(`${year}-${month}-${day}`);
                      } else {
                        field.onChange(undefined);
                      }
                    }}
                    initialFocus
                    disabled={disabledDate}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimatedCompletionDate"
          render={({ field }: { field: any }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(new Date(field.value + 'T12:00:00'), "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        field.onChange(`${year}-${month}-${day}`);
                      } else {
                        field.onChange(undefined);
                      }
                    }}
                    initialFocus
                    disabled={disabledDate}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="scheduledStartTime"
        render={({ field }: { field: any }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Scheduled Time <span className="text-muted-foreground font-normal">(optional)</span>
            </FormLabel>
            <FormControl>
              <TimeSelect field={field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
