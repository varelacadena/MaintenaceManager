import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const categories = [
  "Appliances",
  "Electrical",
  "Plumbing",
  "Heating, Ventilation, A/C",
  "Lawn",
  "Home Renovation",
  "Pest Control",
  "Other",
];

const urgencyLevels = ["Low", "Medium", "High"];

const formSchema = z.object({
  title: z.string().min(1, "Request title is required"),
  category: z.string().min(1, "Category is required"),
  urgency: z.string().min(1, "Urgency is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface ServiceRequestFormProps {
  onSubmit?: (data: FormData) => void;
}

export default function ServiceRequestForm({ onSubmit }: ServiceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      urgency: "",
      date: "",
      description: "",
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    console.log("Service request submitted:", data);
    if (onSubmit) {
      onSubmit(data);
    }
    setTimeout(() => {
      setIsSubmitting(false);
      form.reset();
    }, 1000);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request Title</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the issue" {...field} data-testid="input-request-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Urgency Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-urgency">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {urgencyLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested Completion Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide detailed information about the maintenance request..."
                  className="min-h-32 resize-none"
                  {...field}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="button-submit-request">
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </Form>
  );
}
