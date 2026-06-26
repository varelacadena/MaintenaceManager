import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
import { toCalendarDate } from "@/lib/taskCalendarDates";

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
            <FormControl>
              <DatePicker
                value={field.value ? toCalendarDate(field.value) ?? undefined : undefined}
                onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                placeholder="No end date"
              />
            </FormControl>
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
