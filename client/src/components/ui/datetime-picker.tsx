import * as React from "react";
import { format } from "date-fns";
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
            <span className="truncate">{format(value, "MMM d, yyyy")} at {formatDisplayTime(selectedHour, selectedMinute)}</span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 z-[150] max-w-[calc(100vw-2rem)]" 
        align="center" 
        sideOffset={4}
      >
        {/* Calendar */}
        <div className="p-2 sm:p-3">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              const minDay = minDate ? new Date(minDate) : new Date();
              minDay.setHours(0, 0, 0, 0);
              return date < minDay;
            }}
            showOutsideDays={false}
            classNames={{
              months: "flex flex-col",
              month: "space-y-1",
              caption: "flex justify-center relative items-center h-8",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
              nav_button_previous: "absolute left-0",
              nav_button_next: "absolute right-0",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-muted-foreground w-8 sm:w-9 font-normal text-xs",
              row: "flex w-full",
              cell: "h-8 w-8 sm:h-9 sm:w-9 text-center text-sm p-0 relative",
              day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal rounded hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center text-sm",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-medium",
              day_outside: "text-muted-foreground/40",
              day_disabled: "text-muted-foreground/30",
              day_hidden: "invisible",
            }}
          />
        </div>

        {/* Time picker footer */}
        <div className="border-t px-2 sm:px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm text-muted-foreground">Time:</span>
            <Select value={selectedHour} onValueChange={(h) => handleTimeChange(h, selectedMinute)}>
              <SelectTrigger className="w-14 h-8 text-sm" data-testid={testId ? `${testId}-hour` : undefined}>
                <SelectValue placeholder="Hr" />
              </SelectTrigger>
              <SelectContent className="max-h-48 z-[200]">
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour} className="text-sm">
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">:</span>
            <Select value={selectedMinute} onValueChange={(m) => handleTimeChange(selectedHour, m)}>
              <SelectTrigger className="w-14 h-8 text-sm" data-testid={testId ? `${testId}-minute` : undefined}>
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute} className="text-sm">
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {parseInt(selectedHour) >= 12 ? "PM" : "AM"}
            </span>
          </div>
          <Button size="sm" className="h-8" onClick={handleConfirm} data-testid={testId ? `${testId}-confirm` : undefined}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
