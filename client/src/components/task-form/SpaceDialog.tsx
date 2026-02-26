import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertSpaceSchema } from "@shared/schema";
import type { Space } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const spaceFormSchema = insertSpaceSchema.omit({ propertyId: true }).extend({
  name: z.string().min(1, "Name is required"),
});

type SpaceFormData = z.infer<typeof spaceFormSchema>;

interface SpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
  propertyId: string;
  onSuccess: (newSpace: Space) => void;
}

export function SpaceDialog({
  open,
  onOpenChange,
  propertyName,
  propertyId,
  onSuccess,
}: SpaceDialogProps) {
  const { toast } = useToast();

  const spaceForm = useForm<SpaceFormData>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues: {
      name: "",
      floor: "",
      description: "",
    },
  });

  const createSpaceMutation = useMutation({
    mutationFn: async (data: SpaceFormData) => {
      const res = await apiRequest("POST", "/api/spaces", { ...data, propertyId });
      return res.json();
    },
    onSuccess: (newSpace: Space) => {
      queryClient.invalidateQueries({ queryKey: ["/api/spaces", propertyId] });
      onOpenChange(false);
      spaceForm.reset({
        name: "",
        floor: "",
        description: "",
      });
      toast({
        title: "Space Created",
        description: "The new space has been added and selected.",
      });
      onSuccess(newSpace);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create space",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Space</DialogTitle>
          <DialogDescription>
            Add a new space to {propertyName || "this property"}
          </DialogDescription>
        </DialogHeader>
        <Form {...spaceForm}>
          <form
            onSubmit={spaceForm.handleSubmit((data) => createSpaceMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={spaceForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Main Office, Grounds, Classroom 101" data-testid="input-new-space-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={spaceForm.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="e.g., 1st Floor, Ground" data-testid="input-new-space-floor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={spaceForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Optional description of this space"
                      data-testid="textarea-new-space-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-space"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSpaceMutation.isPending}
                data-testid="button-submit-space"
              >
                {createSpaceMutation.isPending ? "Adding..." : "Add Space"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
