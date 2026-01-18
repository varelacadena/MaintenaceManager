import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
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
            <span className="truncate">{format(value, "EEE, MMM d, yyyy")} at {formatTimeDisplay(selectedHour)}:{selectedMinute}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </Button>
      
      {isOpen && (
        <div className="border rounded-lg bg-card shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="text-sm font-medium">Pick a date & time</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const minDay = minDate ? new Date(minDate) : new Date();
                minDay.setHours(0, 0, 0, 0);
                return date < minDay;
              }}
              className="mx-auto"
            />
          </div>
          
          <div className="border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2">
                  <Select value={selectedHour} onValueChange={(h) => handleTimeChange(h, selectedMinute)}>
                    <SelectTrigger className="w-20 h-9" data-testid={testId ? `${testId}-hour` : undefined}>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 z-[200]">
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {formatTimeDisplay(hour).split(" ")[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-medium text-muted-foreground">:</span>
                  <Select value={selectedMinute} onValueChange={(m) => handleTimeChange(selectedHour, m)}>
                    <SelectTrigger className="w-20 h-9" data-testid={testId ? `${testId}-minute` : undefined}>
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
                  <span className="text-sm font-medium text-muted-foreground">
                    {parseInt(selectedHour) >= 12 ? "PM" : "AM"}
                  </span>
                </div>
              </div>
              <Button onClick={handleConfirm} data-testid={testId ? `${testId}-confirm` : undefined}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
