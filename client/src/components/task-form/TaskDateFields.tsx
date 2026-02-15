import { CalendarIcon } from "lucide-react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskDateFieldsProps {
  form: any;
  allowPastDates?: boolean;
}

export function TaskDateFields({ form, allowPastDates = false }: TaskDateFieldsProps) {
  const disabledDate = allowPastDates ? undefined : (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0));
  return (
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
  );
}
