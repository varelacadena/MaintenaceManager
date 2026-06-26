import { useEffect, useState } from "react";
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
  FormDescription,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PropertySelectItems, SpaceSelectItems } from "@/components/PropertySelectItems";
import type { Property, Space } from "@shared/schema";
import { z } from "zod";
import { X, Check, Paperclip, ChevronDown, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  getSignedUploadParameters,
  mapUploaderResultToPending,
  mapUploaderResultForRegistration,
} from "@/lib/uploadUtils";

const categories = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "Mechanical / Fleet",
  "Appliances",
  "Grounds / Landscaping",
  "Janitorial",
  "Structural",
  "Water Treatment",
  "General",
];

const formSchema = z.object({
  title: z.string().min(1, "Please describe what needs attention"),
  description: z.string().min(1, "Please tell us what happened"),
  propertyId: z.string().min(1, "Please select where the issue is"),
  spaceId: z.string().optional(),
  category: z.string().optional(),
  isUrgent: z.boolean().default(false),
  requesterId: z.string().min(1),
  requestedDate: z.string().min(1),
});

type FormData = z.infer<typeof formSchema>;

export default function NewRequest() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{
    name: string;
    fileName: string;
    url: string;
    objectUrl: string;
    objectPath?: string;
    type: string;
    size: number;
  }>>([]);

  const {
    data: properties = [],
    isLoading: isPropertiesLoading,
    isError: isPropertiesError,
  } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const isBuilding = selectedProperty?.type === "building";

  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ["/api/spaces", selectedPropertyId],
    enabled: isBuilding && !!selectedPropertyId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/spaces?propertyId=${selectedPropertyId}`);
      return response.json();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      isUrgent: false,
      requestedDate: new Date().toISOString().split("T")[0],
      requesterId: user?.id || "",
      spaceId: "",
      propertyId: "",
    },
  });

  useEffect(() => {
    if (user?.id) {
      form.setValue("requesterId", user.id);
    }
  }, [form, user?.id]);

  const createRequestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/service-requests", {
        title: data.title,
        description: data.description,
        propertyId: data.propertyId,
        spaceId: data.spaceId || undefined,
        category: data.category?.trim() || "General",
        urgency: data.isUrgent ? "high" : "medium",
        requestedDate: new Date(data.requestedDate),
        requesterId: data.requesterId,
      });
      const requestData = await response.json();

      if (pendingAttachments.length > 0) {
        let failedAttachments = 0;
        for (const attachment of pendingAttachments) {
          try {
            await apiRequest("POST", "/api/uploads", {
              requestId: requestData.id,
              ...mapUploaderResultForRegistration({
                fileName: attachment.fileName || attachment.name,
                type: attachment.type,
                objectUrl: attachment.objectUrl || attachment.url,
                objectPath: attachment.objectPath,
              }),
            });
          } catch (error) {
            console.error("Error uploading attachment:", error);
            failedAttachments += 1;
          }
        }
        if (failedAttachments > 0) {
          toast({
            title: "Some attachments failed",
            description: `${failedAttachments} file(s) could not be attached to the request.`,
            variant: "destructive",
          });
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
      navigate(`/requests/${data.id}`, { replace: true });
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

  const handleFileUpload = async (result: any) => {
    if (result.successful?.length > 0) {
      const newAttachments = result.successful.map((file: any) => {
        const pending = mapUploaderResultToPending(file);
        return {
          name: file.file?.name || file.name || file.fileName || "Unknown File",
          fileName: pending.fileName,
          url: pending.objectUrl,
          objectUrl: pending.objectUrl,
          objectPath: pending.objectPath,
          type: file.file?.type || file.type || "application/octet-stream",
          size: file.file?.size || file.size || 0,
        };
      });

      setPendingAttachments((prev) => [...prev, ...newAttachments]);

      toast({
        title: "Photo added",
        description: `${result.successful.length} file(s) will be attached when you submit`,
      });
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileExtension = (filename: string) => {
    if (!filename) return "FILE";
    const parts = filename.split(".");
    if (parts.length <= 1) return "FILE";
    const ext = parts[parts.length - 1]?.toUpperCase();
    return ext || "FILE";
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeIndex = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(2)) + " " + sizes[sizeIndex];
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3 p-3 md:p-4 pb-8">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Report an issue</h1>
        <p className="text-sm text-muted-foreground">
          Tell us where it is and what&apos;s wrong — we&apos;ll take it from there.
        </p>
      </div>

      <Card className="p-3 md:p-5 border-0 shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Location */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Where is it?</p>

              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Property</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPropertyId(value);
                        form.setValue("spaceId", "");
                      }}
                      value={field.value || undefined}
                      disabled={isPropertiesLoading || isPropertiesError}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue
                            placeholder={
                              isPropertiesLoading
                                ? "Loading locations..."
                                : isPropertiesError
                                  ? "Could not load locations"
                                  : "Select building or property"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <PropertySelectItems
                          properties={properties}
                          noneValue={false}
                        />
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isBuilding && spaces.length > 0 && (
                <FormField
                  control={form.control}
                  name="spaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-normal">
                        Room or area <span className="text-muted-foreground/70">(optional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "__none__" ? "" : value)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-space">
                            <SelectValue placeholder="Not sure — leave blank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SpaceSelectItems
                            spaces={spaces}
                            noneLabel="Not sure / whole building"
                          />
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Issue details */}
            <div className="space-y-4 pt-1 border-t">
              <p className="text-sm font-medium text-foreground pt-3">What&apos;s wrong?</p>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Summary</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Leaking faucet in restroom"
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
                    <FormLabel className="text-muted-foreground font-normal">
                      Tell us what happened
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What did you notice? When did it start? Anything else we should know?"
                        rows={4}
                        {...field}
                        data-testid="textarea-request-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Urgent */}
            <FormField
              control={form.control}
              name="isUrgent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-3 bg-muted/30">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-urgent"
                    />
                  </FormControl>
                  <div className="space-y-0.5 leading-none">
                    <FormLabel className="flex items-center gap-1.5 font-medium cursor-pointer">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      This is urgent or a safety issue
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Check this for emergencies, flooding, no heat/AC, or anything unsafe.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Optional photo */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Add a photo <span className="text-muted-foreground/70">(optional)</span>
              </p>
              <ObjectUploader
                maxNumberOfFiles={10}
                maxFileSize={10485760}
                onGetUploadParameters={getSignedUploadParameters}
                onComplete={handleFileUpload}
                onError={(error) => {
                  toast({
                    title: "Upload failed",
                    description: error.message,
                    variant: "destructive",
                  });
                }}
                buttonVariant="outline"
                buttonClassName="w-full border-dashed bg-muted/20 text-foreground hover:bg-muted"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add photo or file
              </ObjectUploader>

              {pendingAttachments.length > 0 && (
                <div className="space-y-2">
                  {pendingAttachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-md border bg-card"
                      data-testid={`attachment-${index}`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary shrink-0">
                          <span className="text-[10px] font-semibold">
                            {getFileExtension(attachment.name)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removePendingAttachment(index)}
                        data-testid={`button-remove-attachment-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced: category */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-advanced-details"
                >
                  <span>More details (optional)</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 pb-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-normal">
                        Type of issue
                      </FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "__none__" ? "" : value)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Let maintenance decide" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Not sure</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Our team can categorize this when they review your request.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createRequestMutation.isPending}
              data-testid="button-submit-request"
            >
              {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
