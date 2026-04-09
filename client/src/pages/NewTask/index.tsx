import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ClipboardList } from "lucide-react";
import { SpaceDialog } from "@/components/task-form/SpaceDialog";
import { useNewTask } from "./useNewTask";
import { LeftColumnSections, RightColumnSidebar } from "./NewTaskFormSections";
import { NewTaskSubtaskSection } from "./NewTaskSubtaskSection";
import { NewTaskChecklistSection } from "./NewTaskChecklistSection";
import { NewTaskEquipmentDialog } from "./NewTaskEquipmentDialog";

export default function NewTask() {
  const ctx = useNewTask();
  const {
    user, navigate,
    requestId,
    project,
    selectedProperty, selectedPropertyId, selectedSpaceId,
    isSpaceDialogOpen, setIsSpaceDialogOpen,
    form,
    createTaskMutation,
    handleSubmit,
    setSelectedSpaceId,
  } = ctx;

  if (user?.role !== "admin" && user?.role !== "technician") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don't have permission to create tasks.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-3 md:p-6 pb-40">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
          {requestId ? "Convert to Task" : "New Task"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {requestId ? "Create a task from this service request" : "Fill in the details below"}
        </p>
      </div>

      {project && (
        <Card className="p-4 mb-6 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Creating task for project:</p>
              <p className="text-foreground font-semibold" data-testid="text-project-name">{project.name}</p>
            </div>
          </div>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            <div className="w-full lg:w-[65%] space-y-8 pb-12">
              <LeftColumnSections ctx={ctx} />
              <NewTaskSubtaskSection ctx={ctx} />
              <NewTaskChecklistSection ctx={ctx} />
            </div>

            <div className="w-full lg:w-[35%]">
              <div className="lg:sticky lg:top-6 space-y-6">
                <RightColumnSidebar ctx={ctx} />
              </div>
            </div>
          </div>

          <div className="h-24" aria-hidden="true" />

          <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur border-t z-10 md:left-[var(--sidebar-width)]">
            <div className="max-w-[1200px] mx-auto flex gap-3 md:ml-0">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(requestId ? `/requests/${requestId}` : "/tasks")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createTaskMutation.isPending}
                data-testid="button-submit"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <NewTaskEquipmentDialog ctx={ctx} />

      <SpaceDialog
        open={isSpaceDialogOpen}
        onOpenChange={setIsSpaceDialogOpen}
        propertyName={selectedProperty?.name || "the building"}
        propertyId={selectedPropertyId}
        onSuccess={(newSpace) => {
          form.setValue("spaceId", newSpace.id);
          setSelectedSpaceId(newSpace.id);
        }}
      />
    </div>
  );
}
