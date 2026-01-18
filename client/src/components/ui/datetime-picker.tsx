import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const formatTimeDisplay = (hour: string) => {
    const h = parseInt(hour);
    if (h === 0) return "12";
    if (h > 12) return `${h - 12}`;
    return `${h}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between text-left font-normal h-10",
          !value && "text-muted-foreground"
        )}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        data-testid={testId}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {value ? (
            <span className="truncate">{format(value, "MMM d, yyyy")} at {formatTimeDisplay(selectedHour)}:{selectedMinute} {parseInt(selectedHour) >= 12 ? "PM" : "AM"}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </Button>
      
      {isOpen && (
        <div className="border rounded-lg bg-card shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Select date & time</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
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
              showOutsideDays={false}
              className="mx-auto"
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-xs font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[10px]",
                row: "flex w-full mt-1",
                cell: "h-7 w-7 text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
                day: "h-7 w-7 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center",
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-medium",
                day_outside: "text-muted-foreground/40",
                day_disabled: "text-muted-foreground/30 opacity-50",
                day_hidden: "invisible",
              }}
            />
          </div>
          
          <div className="border-t bg-muted/30 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                <Select value={selectedHour} onValueChange={(h) => handleTimeChange(h, selectedMinute)}>
                  <SelectTrigger className="w-14 h-7 text-xs" data-testid={testId ? `${testId}-hour` : undefined}>
                    <SelectValue placeholder="Hr" />
                  </SelectTrigger>
                  <SelectContent className="max-h-40 z-[200]">
                    {hours.map((hour) => (
                      <SelectItem key={hour} value={hour} className="text-xs">
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">:</span>
                <Select value={selectedMinute} onValueChange={(m) => handleTimeChange(selectedHour, m)}>
                  <SelectTrigger className="w-14 h-7 text-xs" data-testid={testId ? `${testId}-minute` : undefined}>
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {minutes.map((minute) => (
                      <SelectItem key={minute} value={minute} className="text-xs">
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs font-medium text-muted-foreground">
                  {parseInt(selectedHour) >= 12 ? "PM" : "AM"}
                </span>
              </div>
              <Button size="sm" className="h-7 text-xs px-3" onClick={handleConfirm} data-testid={testId ? `${testId}-confirm` : undefined}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
