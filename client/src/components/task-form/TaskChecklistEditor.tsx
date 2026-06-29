import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, ListChecks, FileText, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChecklistTemplate } from "@shared/schema";
import type { EditableChecklistGroup } from "@/lib/syncTaskChecklists";

type ChecklistItemDraft = { id?: string; text: string; isCompleted: boolean };

interface TaskChecklistEditorProps {
  groups: EditableChecklistGroup[];
  onChange: (groups: EditableChecklistGroup[]) => void;
  showOptionalBadge?: boolean;
}

export function TaskChecklistEditor({
  groups,
  onChange,
  showOptionalBadge = true,
}: TaskChecklistEditorProps) {
  const { toast } = useToast();
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null);
  const [dialogChecklistName, setDialogChecklistName] = useState("");
  const [dialogChecklistItems, setDialogChecklistItems] = useState<ChecklistItemDraft[]>([]);
  const [newDialogChecklistItem, setNewDialogChecklistItem] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [saveTemplateDescription, setSaveTemplateDescription] = useState("");
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState(false);

  const { data: checklistTemplates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; items: { text: string; sortOrder: number }[] }) => {
      const response = await apiRequest("POST", "/api/checklist-templates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      setIsTemplateDialogOpen(false);
      setSaveTemplateName("");
      setSaveTemplateDescription("");
      toast({
        title: "Template saved",
        description: "The checklist template has been saved for future use.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const applyTemplate = (template: ChecklistTemplate) => {
    const rawItems = template.items;
    let validItems: ChecklistItemDraft[] = [];

    if (Array.isArray(rawItems)) {
      validItems = rawItems
        .filter((item: { text?: string }) => item && typeof item.text === "string" && item.text.trim())
        .map((item: { text: string }) => ({ text: item.text.trim(), isCompleted: false }));
    }

    onChange([
      ...groups,
      {
        name: template.name,
        items: validItems,
      },
    ]);
    setIsTemplatePopoverOpen(false);
    toast({
      title: "Template applied",
      description: `Checklist "${template.name}" has been added.`,
    });
  };

  const handleSaveAsTemplate = () => {
    if (!dialogChecklistName.trim() || dialogChecklistItems.length === 0) {
      toast({
        title: "Cannot save template",
        description: "Add a name and at least one item to save as a template.",
        variant: "destructive",
      });
      return;
    }
    setSaveTemplateName(dialogChecklistName);
    setIsTemplateDialogOpen(true);
  };

  const confirmSaveTemplate = () => {
    if (!saveTemplateName.trim()) return;
    saveTemplateMutation.mutate({
      name: saveTemplateName.trim(),
      description: saveTemplateDescription.trim() || undefined,
      items: dialogChecklistItems.map((item, idx) => ({ text: item.text, sortOrder: idx })),
    });
  };

  const openAddDialog = () => {
    setEditingChecklistIndex(null);
    setDialogChecklistName("");
    setDialogChecklistItems([]);
    setNewDialogChecklistItem("");
    setIsChecklistDialogOpen(true);
  };

  const openEditDialog = (groupIndex: number) => {
    const group = groups[groupIndex];
    setEditingChecklistIndex(groupIndex);
    setDialogChecklistName(group.name);
    setDialogChecklistItems(
      group.items.map((item) => ({ id: item.id, text: item.text, isCompleted: item.isCompleted })),
    );
    setNewDialogChecklistItem("");
    setIsChecklistDialogOpen(true);
  };

  const saveDialogChecklist = () => {
    if (!dialogChecklistName.trim()) return;

    if (editingChecklistIndex !== null) {
      onChange(
        groups.map((group, index) =>
          index === editingChecklistIndex
            ? {
                ...group,
                name: dialogChecklistName.trim(),
                items: dialogChecklistItems.map((item) => ({
                  id: item.id,
                  text: item.text,
                  isCompleted: item.isCompleted,
                })),
              }
            : group,
        ),
      );
    } else {
      onChange([
        ...groups,
        {
          name: dialogChecklistName.trim(),
          items: dialogChecklistItems.map((item) => ({
            text: item.text,
            isCompleted: item.isCompleted,
          })),
        },
      ]);
    }

    setIsChecklistDialogOpen(false);
    setDialogChecklistName("");
    setDialogChecklistItems([]);
    setNewDialogChecklistItem("");
    setEditingChecklistIndex(null);
    setEditingItemIndex(null);
  };

  const toggleItemCompleted = (groupIndex: number, itemIndex: number, checked: boolean) => {
    onChange(
      groups.map((group, gIdx) =>
        gIdx === groupIndex
          ? {
              ...group,
              items: group.items.map((item, iIdx) =>
                iIdx === itemIndex ? { ...item, isCompleted: checked } : item,
              ),
            }
          : group,
      ),
    );
  };

  return (
    <>
      <section className="space-y-4" data-testid="section-checklists">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-medium" style={{ color: "#6B7280" }}>
              Checklists
            </h2>
            {showOptionalBadge && (
              <Badge variant="secondary" className="text-xs">Optional</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {checklistTemplates.length > 0 && (
              <Popover open={isTemplatePopoverOpen} onOpenChange={setIsTemplatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-template-popover">
                    <FileText className="h-4 w-4 mr-1" />
                    Templates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="end">
                  <div className="space-y-1">
                    {checklistTemplates.map((template) => (
                      <Button
                        key={template.id}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start h-auto py-2 px-2"
                        onClick={() => applyTemplate(template)}
                        data-testid={`button-template-${template.id}`}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="text-sm font-medium">{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground">{template.description}</span>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddDialog}
              data-testid="button-add-checklist"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((group, groupIndex) => (
              <div
                key={group.id ?? `new-${groupIndex}`}
                className="p-3 border rounded-md space-y-2"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{group.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(groupIndex)}
                      data-testid={`button-edit-checklist-${groupIndex}`}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}
                      data-testid={`button-remove-checklist-${groupIndex}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {group.items.length > 0 ? (
                  <div className="space-y-1 pl-1">
                    {group.items.map((item, itemIndex) => (
                      <div
                        key={item.id ?? `new-${groupIndex}-${itemIndex}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={(checked) =>
                            toggleItemCompleted(groupIndex, itemIndex, checked === true)
                          }
                          className="h-3 w-3"
                          data-testid={`checkbox-checklist-${groupIndex}-item-${itemIndex}`}
                        />
                        <span className={item.isCompleted ? "line-through" : ""}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No items yet</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">
              Add checklists for required inspections or procedures.
            </p>
          </div>
        )}
      </section>

      <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChecklistIndex !== null ? "Edit Checklist" : "Add Checklist"}</DialogTitle>
            <DialogDescription>Create a checklist with items to complete</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Checklist Name *</Label>
              <Input
                placeholder="e.g., Safety Checks"
                value={dialogChecklistName}
                onChange={(e) => setDialogChecklistName(e.target.value)}
                data-testid="input-checklist-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              {dialogChecklistItems.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {dialogChecklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {editingItemIndex === idx ? (
                        <Input
                          autoFocus
                          className="flex-1 h-8"
                          value={item.text}
                          onChange={(e) => {
                            setDialogChecklistItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)),
                            );
                          }}
                          onBlur={() => setEditingItemIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setEditingItemIndex(null);
                            }
                            if (e.key === "Escape") {
                              setEditingItemIndex(null);
                            }
                          }}
                          data-testid={`input-edit-item-${idx}`}
                        />
                      ) : (
                        <span
                          className="flex-1 cursor-pointer hover-elevate px-2 py-1 rounded"
                          onClick={() => setEditingItemIndex(idx)}
                          data-testid={`text-checklist-item-${idx}`}
                        >
                          {item.text}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setDialogChecklistItems(dialogChecklistItems.filter((_, i) => i !== idx));
                          if (editingItemIndex === idx) setEditingItemIndex(null);
                        }}
                        data-testid={`button-remove-dialog-item-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add an item..."
                  value={newDialogChecklistItem}
                  onChange={(e) => setNewDialogChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDialogChecklistItem.trim()) {
                      e.preventDefault();
                      setDialogChecklistItems([
                        ...dialogChecklistItems,
                        { text: newDialogChecklistItem.trim(), isCompleted: false },
                      ]);
                      setNewDialogChecklistItem("");
                    }
                  }}
                  data-testid="input-new-checklist-item"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (newDialogChecklistItem.trim()) {
                      setDialogChecklistItems([
                        ...dialogChecklistItems,
                        { text: newDialogChecklistItem.trim(), isCompleted: false },
                      ]);
                      setNewDialogChecklistItem("");
                    }
                  }}
                  data-testid="button-add-checklist-item"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dialogChecklistName.trim() || dialogChecklistItems.length === 0}
              onClick={handleSaveAsTemplate}
              className="mr-auto"
              data-testid="button-save-as-template"
            >
              <Save className="h-4 w-4 mr-1" />
              Save as Template
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsChecklistDialogOpen(false);
                  setEditingItemIndex(null);
                }}
                data-testid="button-cancel-checklist"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!dialogChecklistName.trim()}
                onClick={saveDialogChecklist}
                data-testid="button-save-checklist"
              >
                {editingChecklistIndex !== null ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this checklist as a reusable template for future tasks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Safety Inspection Checklist"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of when to use this template..."
                value={saveTemplateDescription}
                onChange={(e) => setSaveTemplateDescription(e.target.value)}
                className="resize-none"
                data-testid="textarea-template-description"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This template will include {dialogChecklistItems.length} item
              {dialogChecklistItems.length !== 1 ? "s" : ""}.
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(false)}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!saveTemplateName.trim() || saveTemplateMutation.isPending}
              onClick={confirmSaveTemplate}
              data-testid="button-confirm-save-template"
            >
              {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
