import { useTechnicianTaskDetail } from "./useTechnicianTaskDetail";
import { TechnicianHero } from "./TechnicianHero";
import { TechnicianTaskTab } from "./TechnicianTaskTab";
import { TechnicianMoreTab } from "./TechnicianMoreTab";
import { TechnicianBottomBar } from "./TechnicianBottomBar";
import { TechnicianDialogs } from "./TechnicianDialogs";
import { TechnicianDialogsExtra } from "./TechnicianDialogsExtra";
export type { TechnicianTaskDetailProps } from "./types";
import type { TechnicianTaskDetailProps } from "./types";

export function TechnicianTaskDetail(props: TechnicianTaskDetailProps) {
  const {
    task, multiProperties = [], parts, quotes, vendors, inventoryItems, taskHelpers = [],
    checklistGroups, subTasks, uploads, notes, allTaskResources, previousWork, users,
    isSubTask, completedSubTasks, subTaskProgress,
    totalChecklistItems, completedChecklistItems, estimateBlocksCompletion,
    startTimerMutation, stopTimerMutation, addPartMutation, addUploadMutation,
    toggleChecklistItemMutation, createQuoteMutation, deleteUploadMutation,
    safeNavigate, getUploadParameters, handleAutoSaveUpload,
    handleEquipmentScan, handleScanPart,
    isScanEquipmentOpen, setIsScanEquipmentOpen,
    isScanPartOpen, setIsScanPartOpen,
    isEquipmentLoading,
    selectedInventoryItemId, setSelectedInventoryItemId,
    inventorySearchQuery, setInventorySearchQuery,
    partQuantity, setPartQuantity, partNotes, setPartNotes,
    newQuoteEstimatedCost, setNewQuoteEstimatedCost,
    newQuoteVendorId, setNewQuoteVendorId,
    newQuoteVendorName, setNewQuoteVendorName,
    newQuoteNotes, setNewQuoteNotes,
    pendingQuoteFiles,
  } = props;

  const hook = useTechnicianTaskDetail(props);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-muted/40 md:relative md:inset-auto md:z-auto md:min-h-full">
      <TechnicianHero
        task={task}
        isPaused={hook.isPaused}
        isSubTask={isSubTask}
        locationText={hook.locationText}
        locationExpanded={hook.locationExpanded}
        setLocationExpanded={hook.setLocationExpanded}
        hasMoreBuildings={hook.hasMoreBuildings}
        multiProperties={multiProperties}
        safeNavigate={safeNavigate}
        taskStarted={hook.taskStarted}
        elapsedSeconds={hook.elapsedSeconds}
      />

      <div className="flex shrink-0 bg-background border-b border-border" data-testid="tech-tabs">
        {(["task", "more"] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              hook.activeTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent"
            }`}
            onClick={() => hook.setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            {tab === "task" ? "Task" : "More"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-36" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="px-2.5 py-2 space-y-2">
          {hook.activeTab === "task" ? (
            <TechnicianTaskTab
              task={task}
              taskStarted={hook.taskStarted}
              isCompleted={hook.isCompleted}
              estimateBlocksCompletion={estimateBlocksCompletion}
              taskHelpers={taskHelpers}
              subTasks={subTasks}
              completedSubTasks={completedSubTasks}
              subTaskProgress={subTaskProgress}
              checklistGroups={checklistGroups}
              completedChecklistItems={completedChecklistItems}
              totalChecklistItems={totalChecklistItems}
              notes={notes}
              uploads={uploads}
              noteText={hook.noteText}
              saveIndicator={hook.saveIndicator}
              handleNoteChange={hook.handleNoteChange}
              setPreviewUpload={hook.setPreviewUpload}
              toggleChecklistItemMutation={toggleChecklistItemMutation}
              updateSubtaskStatusMutation={props.updateSubtaskStatusMutation}
              safeNavigate={safeNavigate}
              currentNoteId={hook.currentNoteId}
            />
          ) : (
            <TechnicianMoreTab
              task={task}
              contactName={hook.contactName}
              contactPhone={hook.contactPhone}
              contactInitials={hook.contactInitials}
              existingQuote={hook.existingQuote}
              parts={parts}
              previousWork={previousWork}
              allTaskResources={allTaskResources}
              resourceDocs={hook.resourceDocs}
              resourceVids={hook.resourceVids}
              setIsEstimateSheetOpen={hook.setIsEstimateSheetOpen}
              setIsPartModalOpen={hook.setIsPartModalOpen}
              setIsPreviousWorkOpen={hook.setIsPreviousWorkOpen}
              setIsResourcesOpen={hook.setIsResourcesOpen}
            />
          )}
        </div>
      </div>

      <TechnicianBottomBar
        task={task}
        taskStarted={hook.taskStarted}
        isPaused={hook.isPaused}
        isEquipmentLoading={isEquipmentLoading}
        startTimerMutation={startTimerMutation}
        stopTimerMutation={stopTimerMutation}
        addUploadMutation={addUploadMutation}
        setIsScanEquipmentOpen={setIsScanEquipmentOpen}
        handleStartTask={hook.handleStartTask}
        handleResume={hook.handleResume}
        handlePauseTap={hook.handlePauseTap}
        getUploadParameters={getUploadParameters}
        handleAutoSaveUpload={handleAutoSaveUpload}
        toast={hook.toast}
      />

      <TechnicianDialogs
        task={task}
        isPauseDialogOpen={hook.isPauseDialogOpen}
        setIsPauseDialogOpen={hook.setIsPauseDialogOpen}
        handlePauseConfirm={hook.handlePauseConfirm}
        handleMarkComplete={hook.handleMarkComplete}
        stopTimerMutation={stopTimerMutation}
        estimateBlocksCompletion={estimateBlocksCompletion}
        isEstimateSheetOpen={hook.isEstimateSheetOpen}
        setIsEstimateSheetOpen={hook.setIsEstimateSheetOpen}
        quotes={quotes}
        setIsAddQuoteDialogOpen={props.setIsAddQuoteDialogOpen}
        isPartModalOpen={hook.isPartModalOpen}
        setIsPartModalOpen={hook.setIsPartModalOpen}
        inventorySearchQuery={inventorySearchQuery}
        setInventorySearchQuery={setInventorySearchQuery}
        selectedInventoryItemId={selectedInventoryItemId}
        setSelectedInventoryItemId={setSelectedInventoryItemId}
        inventoryItems={inventoryItems}
        partQuantity={partQuantity}
        setPartQuantity={setPartQuantity}
        partNotes={partNotes}
        setPartNotes={setPartNotes}
        addPartMutation={addPartMutation}
        setIsScanPartOpen={setIsScanPartOpen}
        isResourcesOpen={hook.isResourcesOpen}
        setIsResourcesOpen={hook.setIsResourcesOpen}
        allTaskResources={allTaskResources}
      />
      <TechnicianDialogsExtra
        isAddQuoteDialogOpen={props.isAddQuoteDialogOpen}
        setIsAddQuoteDialogOpen={props.setIsAddQuoteDialogOpen}
        newQuoteEstimatedCost={newQuoteEstimatedCost}
        setNewQuoteEstimatedCost={setNewQuoteEstimatedCost}
        newQuoteVendorId={newQuoteVendorId}
        setNewQuoteVendorId={setNewQuoteVendorId}
        newQuoteVendorName={newQuoteVendorName}
        setNewQuoteVendorName={setNewQuoteVendorName}
        newQuoteNotes={newQuoteNotes}
        setNewQuoteNotes={setNewQuoteNotes}
        vendors={vendors}
        createQuoteMutation={createQuoteMutation}
        pendingQuoteFiles={pendingQuoteFiles}
        isPreviousWorkOpen={hook.isPreviousWorkOpen}
        setIsPreviousWorkOpen={hook.setIsPreviousWorkOpen}
        previousWork={previousWork}
        users={users}
        safeNavigate={safeNavigate}
        previewUpload={hook.previewUpload}
        setPreviewUpload={hook.setPreviewUpload}
        deleteUploadMutation={deleteUploadMutation}
        isScanEquipmentOpen={isScanEquipmentOpen}
        setIsScanEquipmentOpen={setIsScanEquipmentOpen}
        handleEquipmentScan={handleEquipmentScan}
        isScanPartOpen={isScanPartOpen}
        setIsScanPartOpen={setIsScanPartOpen}
        handleScanPart={handleScanPart}
        setIsPartModalOpen={hook.setIsPartModalOpen}
        isEquipmentInfoOpen={props.isEquipmentInfoOpen}
        setIsEquipmentInfoOpen={props.setIsEquipmentInfoOpen}
        scannedEquipment={props.scannedEquipment}
        scannedEquipmentTasks={props.scannedEquipmentTasks}
        scannedEquipmentResources={props.scannedEquipmentResources}
        equipmentInfoTab={props.equipmentInfoTab}
        setEquipmentInfoTab={props.setEquipmentInfoTab}
        isVehicleInfoOpen={props.isVehicleInfoOpen}
        setIsVehicleInfoOpen={props.setIsVehicleInfoOpen}
        scannedVehicle={props.scannedVehicle}
      />
    </div>
  );
}
