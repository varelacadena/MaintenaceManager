import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertServiceRequestSchema } from "@shared/schema";
import type { Area, Subdivision } from "@shared/schema";
import { z } from "zod";

const categories = [
  "Indoor Renovation",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Kitchen Appliances",
  "Grounds & Landscaping",
  "Building Cleaning",
  "Other",
];

const formSchema = insertServiceRequestSchema.extend({
  requestedDate: z.string().min(1, "Please select a date"),
});

type FormData = z.infer<typeof formSchema>;

export default function NewRequest() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["/api/areas"],
  });

  const { data: subdivisions = [] } = useQuery<Subdivision[]>({
    queryKey: ["/api/subdivisions", selectedAreaId],
    enabled: !!selectedAreaId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      urgency: "medium",
      requestedDate: new Date().toISOString().split("T")[0],
      requesterId: user?.id || "",
      areaId: null,
      subdivisionId: null,
      assignedToId: null,
      onHoldReason: null,
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/service-requests", {
        ...data,
        requestedDate: new Date(data.requestedDate),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({
        title: "Request Submitted",
        description: "Your maintenance request has been submitted successfully.",
      });
      navigate(`/requests/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    createRequestMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Service Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a new maintenance request
        </p>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the issue"
                      {...field}
                      data-testid="input-request-title"
                    />
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
                      placeholder="Provide detailed information about the maintenance issue"
                      rows={5}
                      {...field}
                      data-testid="textarea-request-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-urgency">
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="areaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedAreaId(value);
                        form.setValue("subdivisionId", null);
                      }}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-area">
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
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
                name="subdivisionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdivision (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={!selectedAreaId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-subdivision">
                          <SelectValue placeholder="Select subdivision" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subdivisions.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
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
              name="requestedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-requested-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createRequestMutation.isPending}
              data-testid="button-submit-request"
            >
              {createRequestMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
