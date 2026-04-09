import { TechnicianTaskDetail } from "@/components/TechnicianTaskDetail";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
import { useTaskDetail } from "./useTaskDetail";
import { StudentView } from "./StudentView";
import { AdminView } from "./AdminView";

export default function TaskDetail() {
  const ctx = useTaskDetail();

  if (ctx.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!ctx.task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-lg font-medium">Task not found</p>
          <Button variant="outline" onClick={() => ctx.navigate("/work")} className="mt-4" data-testid="button-back-to-tasks">
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  if (ctx.isStudent) {
    return <StudentView ctx={ctx} />;
  }

  if (ctx.user?.role === "technician") {
    return (
      <>
        <TechnicianTaskDetail
          task={ctx.task}
          user={ctx.user}
          property={ctx.property}
          multiProperties={ctx.multiProperties}
          space={ctx.space}
          equipment={ctx.equipment}
          vehicle={ctx.vehicle}
          contactStaff={ctx.contactStaff}
          notes={ctx.notes}
          uploads={ctx.uploads}
          parts={ctx.parts}
          quotes={ctx.quotes}
          vendors={ctx.vendors}
          inventoryItems={ctx.inventoryItems}
          taskHelpers={ctx.taskHelpers}
          checklistGroups={ctx.checklistGroups}
          subTasks={ctx.subTasks}
          parentTask={ctx.parentTask}
          timeEntries={ctx.timeEntries}
          activeTimer={ctx.activeTimer}
          allTaskResources={ctx.allTaskResources}
          previousWork={ctx.previousWork}
          users={ctx.users}
          isParentTask={ctx.isParentTask}
          isSubTask={ctx.isSubTask}
          completedSubTasks={ctx.completedSubTasks}
          subTaskProgress={ctx.subTaskProgress}
          totalChecklistItems={ctx.totalChecklistItems}
          completedChecklistItems={ctx.completedChecklistItems}
          estimateBlocksCompletion={!!ctx.estimateBlocksCompletion}
          startTimerMutation={ctx.startTimerMutation}
          stopTimerMutation={ctx.stopTimerMutation}
          updateStatusMutation={ctx.updateStatusMutation}
          addNoteMutation={ctx.addNoteMutation}
          updateNoteMutation={ctx.updateNoteMutation}
          addUploadMutation={ctx.addUploadMutation}
          deleteUploadMutation={ctx.deleteUploadMutation}
          addPartMutation={ctx.addPartMutation}
          toggleChecklistItemMutation={ctx.toggleChecklistItemMutation}
          createQuoteMutation={ctx.createQuoteMutation}
          deleteQuoteMutation={ctx.deleteQuoteMutation}
          updateSubtaskStatusMutation={ctx.updateSubtaskStatusMutation}
          safeNavigate={ctx.safeNavigate}
          handleStartOrPause={ctx.handleStartOrPause}
          handleComplete={ctx.handleComplete}
          getUploadParameters={ctx.getUploadParameters}
          handleAutoSaveUpload={ctx.handleAutoSaveUpload}
          handleEquipmentScan={ctx.handleEquipmentScan}
          handleScanPart={ctx.handleScanPart}
          handleAiSuggestParts={ctx.handleAiSuggestParts}
          isScanEquipmentOpen={ctx.isScanEquipmentOpen}
          setIsScanEquipmentOpen={ctx.setIsScanEquipmentOpen}
          isScanPartOpen={ctx.isScanPartOpen}
          setIsScanPartOpen={ctx.setIsScanPartOpen}
          isEquipmentLoading={ctx.isEquipmentLoading}
          isResourcesSheetOpen={ctx.isResourcesSheetOpen}
          setIsResourcesSheetOpen={ctx.setIsResourcesSheetOpen}
          isAddPartDialogOpen={ctx.isAddPartDialogOpen}
          setIsAddPartDialogOpen={ctx.setIsAddPartDialogOpen}
          isAddQuoteDialogOpen={ctx.isAddQuoteDialogOpen}
          setIsAddQuoteDialogOpen={ctx.setIsAddQuoteDialogOpen}
          isStopTimerDialogOpen={ctx.isStopTimerDialogOpen}
          setIsStopTimerDialogOpen={ctx.setIsStopTimerDialogOpen}
          selectedInventoryItemId={ctx.selectedInventoryItemId}
          setSelectedInventoryItemId={ctx.setSelectedInventoryItemId}
          inventorySearchQuery={ctx.inventorySearchQuery}
          setInventorySearchQuery={ctx.setInventorySearchQuery}
          partQuantity={ctx.partQuantity}
          setPartQuantity={ctx.setPartQuantity}
          partNotes={ctx.partNotes}
          setPartNotes={ctx.setPartNotes}
          newQuoteEstimatedCost={ctx.newQuoteEstimatedCost}
          setNewQuoteEstimatedCost={ctx.setNewQuoteEstimatedCost}
          newQuoteVendorId={ctx.newQuoteVendorId}
          setNewQuoteVendorId={ctx.setNewQuoteVendorId}
          newQuoteVendorName={ctx.newQuoteVendorName}
          setNewQuoteVendorName={ctx.setNewQuoteVendorName}
          newQuoteNotes={ctx.newQuoteNotes}
          setNewQuoteNotes={ctx.setNewQuoteNotes}
          pendingQuoteFiles={ctx.pendingQuoteFiles}
          setPendingQuoteFiles={ctx.setPendingQuoteFiles}
          aiSuggestedParts={ctx.aiSuggestedParts}
          isAiSuggestLoading={ctx.isAiSuggestLoading}
          scannedEquipment={ctx.scannedEquipment}
          scannedEquipmentTasks={ctx.scannedEquipmentTasks}
          scannedEquipmentResources={ctx.scannedEquipmentResources}
          isEquipmentInfoOpen={ctx.isEquipmentInfoOpen}
          setIsEquipmentInfoOpen={ctx.setIsEquipmentInfoOpen}
          equipmentInfoTab={ctx.equipmentInfoTab}
          setEquipmentInfoTab={ctx.setEquipmentInfoTab}
          scannedVehicle={ctx.scannedVehicle}
          isVehicleInfoOpen={ctx.isVehicleInfoOpen}
          setIsVehicleInfoOpen={ctx.setIsVehicleInfoOpen}
        />
        <UploadLabelDialog
          open={!!ctx.pendingUploadForLabel}
          fileName={ctx.pendingUploadForLabel?.fileName || ""}
          fileType={ctx.pendingUploadForLabel?.fileType || ""}
          filePreviewUrl={ctx.pendingUploadForLabel?.previewUrl}
          saving={ctx.isUploadLabelSaving}
          onSave={ctx.handleUploadLabelSave}
          onCancel={ctx.handleUploadLabelCancel}
        />
      </>
    );
  }

  return <AdminView ctx={ctx} />;
}
