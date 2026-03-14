import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  "data-testid": testId,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setIsOpen(false);
  };

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
            <span className="truncate">{format(value, "MMM d, yyyy")}</span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          initialFocus
          className="p-2"
          classNames={{
            months: "flex flex-col",
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center mb-1",
            caption_label: "text-xs font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
            nav_button_previous: "absolute left-0",
            nav_button_next: "absolute right-0",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-7 font-medium text-[10px]",
            row: "flex w-full mt-1",
            cell: "h-7 w-7 text-center text-xs p-0 relative",
            day: "h-7 w-7 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground text-xs",
            day_range_end: "day-range-end",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground/40",
            day_disabled: "text-muted-foreground/30",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
