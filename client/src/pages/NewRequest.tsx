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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertServiceRequestSchema } from "@shared/schema";
import type { Area, Subdivision, Property } from "@shared/schema";
import { z } from "zod";
import { Upload, X, Check, CalendarIcon, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";

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

const formSchema = insertServiceRequestSchema.extend({
  requestedDate: z.string().min(1, "Date is required"),
  title: z.string().min(1, "Request title is required"),
  category: z.string().min(1, "Category is required"),
  urgency: z.string().min(1, "Urgency is required"),
  propertyId: z.string().min(1, "Property is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function NewRequest() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [pendingAttachments, setPendingAttachments] = useState<Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>>([]);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      urgency: "medium",
      requestedDate: new Date().toISOString().split("T")[0],
      requesterId: "",
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
      const requestData = await response.json();

      // Upload all pending attachments with proper field mapping
      if (pendingAttachments.length > 0) {
        for (const attachment of pendingAttachments) {
          try {
            await apiRequest("POST", "/api/uploads", {
              requestId: requestData.id,
              fileName: attachment.fileName || attachment.name,
              fileType: attachment.type || "application/octet-stream",
              objectUrl: attachment.objectUrl || attachment.url,
            });
          } catch (error) {
            console.error("Error uploading attachment:", error);
            // Continue with other attachments even if one fails
          }
        }
      }

      return requestData;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });

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

  const getUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get upload URL" }));
      throw new Error(error.message || "Failed to get upload URL");
    }

    const { uploadURL, isMock, warning } = await response.json();

    if (warning) {
      console.warn(warning);
    }

    return { method: "PUT" as const, url: uploadURL };
  };

  const handleFileUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const newAttachments = result.successful.map((file: any) => ({
        name: file.file?.name || file.name || file.fileName || "Unknown File",
        fileName: file.file?.name || file.name || file.fileName || "Unknown File",
        url: file.url || file.objectUrl || file.uploadURL,
        objectUrl: file.url || file.objectUrl || file.uploadURL,
        type: file.file?.type || file.type || "application/octet-stream",
        size: file.file?.size || file.size || 0,
      }));

      setPendingAttachments((prev) => [...prev, ...newAttachments]);

      toast({
        title: "File uploaded",
        description: `${result.successful.length} file(s) ready to attach`,
      });
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileExtension = (filename: string) => {
    if (!filename) return 'FILE';
    const parts = filename.split('.');
    if (parts.length <= 1) return 'FILE';
    const ext = parts[parts.length - 1]?.toUpperCase();
    return ext || 'FILE';
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeIndex = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + ' ' + sizes[sizeIndex];
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">New Service Request</h1>
        <p className="text-base text-muted-foreground">
          Submit a new maintenance request
        </p>
      </div>

      <Card className="p-8 border-0 shadow-md">
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

            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
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

            <FormField
              control={form.control}
              name="requestedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="input-requested-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value + 'T12:00:00'), "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            field.onChange(`${year}-${month}-${day}`);
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const checkDate = new Date(date);
                          checkDate.setHours(0, 0, 0, 0);
                          return checkDate.getTime() !== today.getTime();
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachment Upload Section */}
            <div className="space-y-3">
              <FormLabel>Attachments</FormLabel>
              <div className="flex flex-col gap-3">
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={10485760}
                  onGetUploadParameters={getUploadParameters}
                  onComplete={handleFileUpload}
                  onError={(error) => {
                    toast({
                      title: "Upload failed",
                      description: error.message,
                      variant: "destructive",
                    });
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    data-testid="button-upload-attachment"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach Files
                  </Button>
                </ObjectUploader>

                {pendingAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {pendingAttachments.length} file(s) ready to attach
                    </p>
                    <div className="space-y-2">
                      {pendingAttachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-md border bg-card"
                          data-testid={`attachment-${index}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-10 h-10 rounded bg-primary/10 text-primary shrink-0">
                              <span className="text-xs font-semibold">
                                {getFileExtension(attachment.name)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <Check className="w-4 h-4 text-green-600 shrink-0" />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePendingAttachment(index)}
                            data-testid={`button-remove-attachment-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

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