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
import type { NewTaskContext } from "./useNewTask";

interface NewTaskChecklistSectionProps {
  ctx: NewTaskContext;
}

export function NewTaskChecklistSection({ ctx }: NewTaskChecklistSectionProps) {
  const {
    checklistGroups, setChecklistGroups,
    isChecklistDialogOpen, setIsChecklistDialogOpen,
    editingChecklistIndex, setEditingChecklistIndex,
    dialogChecklistName, setDialogChecklistName,
    dialogChecklistItems, setDialogChecklistItems,
    newDialogChecklistItem, setNewDialogChecklistItem,
    editingItemIndex, setEditingItemIndex,
    isTemplateDialogOpen, setIsTemplateDialogOpen,
    saveTemplateName, setSaveTemplateName,
    saveTemplateDescription, setSaveTemplateDescription,
    isTemplatePopoverOpen, setIsTemplatePopoverOpen,
    checklistTemplates,
    saveTemplateMutation,
    applyTemplate,
    handleSaveAsTemplate,
    confirmSaveTemplate,
  } = ctx;

  return (
    <>
      <section className="pb-4 space-y-4" data-testid="section-checklists">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Checklists</h2>
            <Badge variant="secondary" className="text-xs">Optional</Badge>
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
              onClick={() => {
                setEditingChecklistIndex(null);
                setDialogChecklistName("");
                setDialogChecklistItems([]);
                setNewDialogChecklistItem("");
                setIsChecklistDialogOpen(true);
              }}
              data-testid="button-add-checklist"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
        
        {checklistGroups.length > 0 ? (
          <div className="space-y-3">
            {checklistGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="p-3 border rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{group.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingChecklistIndex(groupIndex);
                        setDialogChecklistName(group.name);
                        setDialogChecklistItems(group.items.map(item => ({ ...item })));
                        setNewDialogChecklistItem("");
                        setIsChecklistDialogOpen(true);
                      }}
                      data-testid={`button-edit-checklist-${groupIndex}`}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setChecklistGroups(checklistGroups.filter((_, i) => i !== groupIndex));
                      }}
                      data-testid={`button-remove-checklist-${groupIndex}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {group.items.length > 0 && (
                  <div className="space-y-1 pl-1">
                    {group.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={(checked) => {
                            setChecklistGroups(prev => prev.map((g, gIdx) =>
                              gIdx === groupIndex
                                ? {
                                    ...g,
                                    items: g.items.map((it, iIdx) =>
                                      iIdx === itemIndex
                                        ? { ...it, isCompleted: checked === true }
                                        : it
                                    )
                                  }
                                : g
                            ));
                          }}
                          className="h-3 w-3"
                          data-testid={`checkbox-checklist-${groupIndex}-item-${itemIndex}`}
                        />
                        <span className={item.isCompleted ? "line-through" : ""}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {group.items.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No items yet</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-muted/10 rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">Add checklists for required inspections or procedures.</p>
          </div>
        )}
      </section>

      <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChecklistIndex !== null ? "Edit Checklist" : "Add Checklist"}</DialogTitle>
            <DialogDescription>
              Create a checklist with items to complete
            </DialogDescription>
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
                            setDialogChecklistItems(prev => prev.map((it, i) =>
                              i === idx ? { ...it, text: e.target.value } : it
                            ));
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
                      setDialogChecklistItems([...dialogChecklistItems, { text: newDialogChecklistItem.trim(), isCompleted: false }]);
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
                      setDialogChecklistItems([...dialogChecklistItems, { text: newDialogChecklistItem.trim(), isCompleted: false }]);
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
              <Button type="button" variant="outline" onClick={() => { setIsChecklistDialogOpen(false); setEditingItemIndex(null); }} data-testid="button-cancel-checklist">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!dialogChecklistName.trim()}
                onClick={() => {
                  if (dialogChecklistName.trim()) {
                    if (editingChecklistIndex !== null) {
                      setChecklistGroups(prev => prev.map((g, i) =>
                        i === editingChecklistIndex
                          ? { name: dialogChecklistName.trim(), items: dialogChecklistItems }
                          : g
                      ));
                    } else {
                      setChecklistGroups(prev => [...prev, { name: dialogChecklistName.trim(), items: dialogChecklistItems }]);
                    }
                    setIsChecklistDialogOpen(false);
                    setDialogChecklistName("");
                    setDialogChecklistItems([]);
                    setNewDialogChecklistItem("");
                    setEditingChecklistIndex(null);
                    setEditingItemIndex(null);
                  }
                }}
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
              This template will include {dialogChecklistItems.length} item{dialogChecklistItems.length !== 1 ? "s" : ""}.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)} data-testid="button-cancel-template">
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
