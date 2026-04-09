import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Space } from "@shared/schema";
import { projectFormSchema, type ProjectFormValues } from "./constants";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties?: Property[];
}

export function CreateProjectDialog({ open, onOpenChange, properties }: CreateProjectDialogProps) {
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      priority: "medium",
      propertyId: null,
      spaceId: null,
      budgetAmount: 0,
      notes: "",
      startDate: "",
      targetEndDate: "",
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);
  const isBuildingProperty = selectedProperty?.type === "building";

  const { data: spaces } = useQuery<Space[]>({
    queryKey: ["/api/spaces", { propertyId: selectedPropertyId }],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const response = await fetch(`/api/spaces?propertyId=${selectedPropertyId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPropertyId,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return await apiRequest("POST", "/api/projects", {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      form.reset();
      toast({ title: "Project created", description: "The project has been created successfully." });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create project", variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-project">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter project name" data-testid="input-project-name" />
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
                    <Textarea {...field} placeholder="Describe the project" data-testid="input-project-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
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
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property (Optional)</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-project-property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isBuildingProperty && spaces && spaces.length > 0 && (
                <FormField
                  control={form.control}
                  name="spaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Space (Optional)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project-space">
                            <SelectValue placeholder="Select space" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {spaces.map((space) => (
                            <SelectItem key={space.id} value={space.id}>
                              {space.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <FormField
              control={form.control}
              name="budgetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid="input-project-budget"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={field.onChange}
                        data-testid="input-project-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={field.onChange}
                        data-testid="input-project-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes" data-testid="input-project-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-submit-project">
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
