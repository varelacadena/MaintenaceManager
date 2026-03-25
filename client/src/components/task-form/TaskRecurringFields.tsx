import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskRecurringFieldsProps {
  form: any;
  taskType: string;
}

export function TaskRecurringFields({ form, taskType }: TaskRecurringFieldsProps) {
  if (taskType !== "recurring") return null;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
      <h3 className="font-semibold">Recurring Parameters</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="recurringFrequency"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger data-testid="select-recurring-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recurringInterval"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Repeat Every</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 1"
                  {...field}
                  onChange={(e: any) => field.onChange(parseInt(e.target.value) || undefined)}
                  value={field.value || ""}
                  data-testid="input-recurring-interval"
                />
              </FormControl>
              <FormDescription>
                Number of periods between occurrences
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="recurringEndDate"
        render={({ field }: { field: any }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End Date (Optional)</FormLabel>
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
                    {field.value ? format(new Date(field.value + 'T12:00:00'), "MMM d, yyyy") : "No end date"}
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
                  className="[--cell-size:2.5rem] p-4"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription>
              Leave empty for tasks that never end
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
