import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { toCalendarDate } from "@/lib/taskCalendarDates";

interface TaskDateFieldsProps {
  form: any;
  allowPastDates?: boolean;
  showActualCompletion?: boolean;
  showEstimatedHours?: boolean;
}

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function setDateValue(form: any, field: any, name: string, date: Date | undefined, required: boolean) {
  if (!date) {
    if (required) return;
    field.onChange("");
    form.setValue(name, "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.clearErrors(name);
    return;
  }

  const value = toDateInputValue(date);
  field.onChange(value);
  form.setValue(name, value, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.clearErrors(name);
}

export function TaskDateFields({
  form,
  allowPastDates = false,
  showActualCompletion = false,
  showEstimatedHours = true,
}: TaskDateFieldsProps) {
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
                  onChange={(date) => setDateValue(form, field, "initialDate", date, true)}
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
                  onChange={(date) => setDateValue(form, field, "estimatedCompletionDate", date, true)}
                  disabledDates={disabledDate}
                  placeholder="Pick date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {showEstimatedHours && (
        <FormField
          control={form.control}
          name="estimatedHours"
          render={({ field }: { field: any }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Estimated Hours <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  placeholder="e.g. 2"
                  data-testid="input-estimated-hours"
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    field.onChange(next === "" ? undefined : Number(next));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showActualCompletion && (
        <FormField
          control={form.control}
          name="actualCompletionDate"
          render={({ field }: { field: any }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Completion Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? toCalendarDate(field.value) ?? undefined : undefined}
                  onChange={(date) => setDateValue(form, field, "actualCompletionDate", date, false)}
                  placeholder="Pick date"
                  clearable
                  data-testid="input-actual-completion-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
