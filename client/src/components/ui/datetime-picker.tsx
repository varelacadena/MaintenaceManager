import * as React from "react";
import { format, addDays, addWeeks } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DayPicker } from "react-day-picker";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  placeholder = "Select date and time",
  disabled = false,
  "data-testid": testId,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [selectedHour, setSelectedHour] = React.useState<string>(
    value ? format(value, "HH") : "09"
  );
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    value ? format(value, "mm") : "00"
  );

  React.useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setSelectedHour(format(value, "HH"));
      setSelectedMinute(format(value, "mm"));
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const newDate = new Date(date);
      newDate.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
      onChange(newDate);
    }
  };

  const handleQuickSelect = (date: Date) => {
    setSelectedDate(date);
    const newDate = new Date(date);
    newDate.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
    onChange(newDate);
  };

  const handleTimeChange = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      onChange(newDate);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
  };

  const formatDisplayTime = (hour: string, minute: string) => {
    const h = parseInt(hour);
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minute} ${period}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const today = new Date();
  const quickOptions = [
    { label: "Today", date: today, display: format(today, "EEE") },
    { label: "Tomorrow", date: addDays(today, 1), display: format(addDays(today, 1), "EEE") },
    { label: "Next week", date: addWeeks(today, 1), display: format(addWeeks(today, 1), "EEE") },
    { label: "In 2 weeks", date: addWeeks(today, 2), display: format(addWeeks(today, 2), "MMM d") },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? (
            <span>{format(value, "MMM d, yyyy")} at {formatDisplayTime(selectedHour, selectedMinute)}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[150]" align="start" sideOffset={4}>
        <div className="flex">
          {/* Quick select options */}
          <div className="border-r p-2 min-w-[120px]">
            <div className="space-y-1">
              {quickOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleQuickSelect(option.date)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover-elevate",
                    selectedDate && format(selectedDate, "yyyy-MM-dd") === format(option.date, "yyyy-MM-dd")
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-xs opacity-70">{option.display}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-2">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const minDay = minDate ? new Date(minDate) : new Date();
                minDay.setHours(0, 0, 0, 0);
                return date < minDay;
              }}
              showOutsideDays
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-xs",
                row: "flex w-full mt-1",
                cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day: "h-8 w-8 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center",
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-medium",
                day_outside: "text-muted-foreground/40",
                day_disabled: "text-muted-foreground/30",
                day_hidden: "invisible",
              }}
            />
          </div>
        </div>

        {/* Time picker footer */}
        <div className="border-t p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time:</span>
            <Select value={selectedHour} onValueChange={(h) => handleTimeChange(h, selectedMinute)}>
              <SelectTrigger className="w-16 h-8" data-testid={testId ? `${testId}-hour` : undefined}>
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent className="max-h-48 z-[200]">
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={selectedMinute} onValueChange={(m) => handleTimeChange(selectedHour, m)}>
              <SelectTrigger className="w-16 h-8" data-testid={testId ? `${testId}-minute` : undefined}>
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {parseInt(selectedHour) >= 12 ? "PM" : "AM"}
            </span>
          </div>
          <Button size="sm" onClick={handleConfirm} data-testid={testId ? `${testId}-confirm` : undefined}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
