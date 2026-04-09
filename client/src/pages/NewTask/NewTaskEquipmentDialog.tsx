import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Paperclip, Trash2 } from "lucide-react";
import type { NewTaskContext } from "./useNewTask";

interface NewTaskEquipmentDialogProps {
  ctx: NewTaskContext;
}

export function NewTaskEquipmentDialog({ ctx }: NewTaskEquipmentDialogProps) {
  const {
    isEquipmentDialogOpen, setIsEquipmentDialogOpen,
    selectedProperty,
    equipmentForm,
    createEquipmentMutation,
    pendingEquipmentFiles, setPendingEquipmentFiles,
    equipmentFileInputRef,
  } = ctx;

  return (
    <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
          <DialogDescription>
            Add new equipment to {selectedProperty?.name || "the property"}
          </DialogDescription>
        </DialogHeader>
        <Form {...equipmentForm}>
          <form
            onSubmit={equipmentForm.handleSubmit((data) => createEquipmentMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={equipmentForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., HVAC Unit #1" data-testid="input-new-equipment-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={equipmentForm.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-new-equipment-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="appliances">Appliances</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="structure">Structure</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="landscaping">Landscaping</SelectItem>
                      <SelectItem value="diagrams">Diagrams</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={equipmentForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Brief description"
                      className="resize-none"
                      data-testid="textarea-new-equipment-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={equipmentForm.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial #</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="SN-12345" data-testid="input-new-equipment-serial" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={equipmentForm.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-equipment-condition">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="needs_repair">Needs Repair</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Attachments</Label>
              <p className="text-xs text-muted-foreground">Add manuals, pictures, or other documents</p>
              <input
                ref={equipmentFileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    setPendingEquipmentFiles(prev => [...prev, ...Array.from(files)]);
                  }
                  if (equipmentFileInputRef.current) {
                    equipmentFileInputRef.current.value = "";
                  }
                }}
                className="hidden"
                data-testid="input-equipment-files"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => equipmentFileInputRef.current?.click()}
                className="w-full"
                data-testid="button-add-equipment-files"
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Files
              </Button>
              {pendingEquipmentFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {pendingEquipmentFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-2 py-1"
                      data-testid={`file-item-${index}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPendingEquipmentFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                        data-testid={`button-remove-file-${index}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEquipmentDialogOpen(false);
                setPendingEquipmentFiles([]);
              }} data-testid="button-cancel-equipment">
                Cancel
              </Button>
              <Button type="submit" disabled={createEquipmentMutation.isPending} data-testid="button-submit-equipment">
                {createEquipmentMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
