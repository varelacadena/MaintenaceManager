import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toCalendarDate } from "@/lib/taskCalendarDates";

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

function buildTimeValue(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${minute}`;
}

function formatDisplay(hour: string, minute: string, period: string): string {
  return `${parseInt(hour, 10)}:${minute} ${period}`;
}

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function setRequiredDate(form: any, field: any, name: string, date: Date | undefined) {
  if (!date) return;

  const value = toDateInputValue(date);
  field.onChange(value);
  form.setValue(name, value, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.clearErrors(name);
}

function TimePopover({ field }: { field: any }) {
  const parsed = parseTimeValue(field.value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);
  const [open, setOpen] = useState(false);

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      const current = parseTimeValue(field.value);
      setHour(current.hour);
      setMinute(current.minute);
      setPeriod(current.period);
    }
    setOpen(isOpen);
  }

  function commit(h: string, m: string, p: string) {
    const resolvedMinute = m || "00";
    const resolvedPeriod = p || "AM";
    if (h) {
      field.onChange(buildTimeValue(h, resolvedMinute, resolvedPeriod));
    }
  }

  function handleHour(val: string) {
    setHour(val);
    const m = minute || "00";
    const p = period || "AM";
    setMinute(m);
    setPeriod(p);
    commit(val, m, p);
  }

  function handleMinute(val: string) {
    setMinute(val);
    if (hour) commit(hour, val, period || "AM");
  }

  function handlePeriod(val: string) {
    setPeriod(val);
    if (hour) commit(hour, minute || "00", val);
  }

  const hasValue = !!field.value;
  const displayParsed = parseTimeValue(field.value);

  return (
    <Popover open={open} onOpenChange={handleOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          data-testid="input-scheduled-time"
          className={cn(
            "w-full justify-start text-left font-normal",
            !hasValue && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {hasValue
            ? formatDisplay(displayParsed.hour, displayParsed.minute, displayParsed.period)
            : "Pick time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex gap-2 items-center">
          <Select value={hour} onValueChange={handleHour}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground font-medium">:</span>

          <Select value={minute} onValueChange={handleMinute}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={handlePeriod}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder="AM/PM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
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
              <FormLabel>Start Date *</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? toCalendarDate(field.value) ?? undefined : undefined}
                  onChange={(date) => setRequiredDate(form, field, "initialDate", date)}
                  disabledDates={disabledDate}
                  placeholder="Pick date"
                />
              </FormControl>
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
              <FormControl>
                <DatePicker
                  value={field.value ? toCalendarDate(field.value) ?? undefined : undefined}
                  onChange={(date) => setRequiredDate(form, field, "estimatedCompletionDate", date)}
                  disabledDates={disabledDate}
                  placeholder="Pick date"
                />
              </FormControl>
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
              <TimePopover field={field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
