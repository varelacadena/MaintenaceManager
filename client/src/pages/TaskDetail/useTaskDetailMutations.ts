import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Task,
  TimeEntry,
  InventoryItem,
  User as UserType,
} from "@shared/schema";

interface MutationDeps {
  id: string | undefined;
  user: UserType | null | undefined;
  task: Task | undefined;
  timeEntries: TimeEntry[];
  inventoryItems: InventoryItem[];
  toast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  navigate: (path: string) => void;
  safeNavigate: (path: string) => void;

  quickInventoryName: string;
  quickInventoryQuantity: number;
  quickInventoryUnit: string;
  selectedInventoryItemId: string;
  partQuantity: string;
  partNotes: string;

  setActiveTimer: (v: string | null) => void;
  setNewMessage: (v: string) => void;
  setIsEquipmentInfoOpen: (v: boolean) => void;
  setIsVehicleInfoOpen: (v: boolean) => void;
  setIsAddSubTaskDialogOpen: (v: boolean) => void;
  setIsStopTimerDialogOpen: (v: boolean) => void;
  setIsHoldReasonDialogOpen: (v: boolean) => void;
  setHoldReason: (v: string) => void;
  setIsQuickAddInventoryOpen: (v: boolean) => void;
  setSelectedInventoryItemId: (v: string) => void;
  setQuickInventoryName: (v: string) => void;
  setQuickInventoryQuantity: (v: number) => void;
  setQuickInventoryUnit: (v: string) => void;
  setIsAddPartDialogOpen: (v: boolean) => void;
  setPartNotes: (v: string) => void;
  setPartQuantity: (v: string) => void;
  setInventorySearchQuery: (v: string) => void;
  setNewNote: (v: string) => void;
  setNoteType: (v: "job_note" | "recommendation") => void;
  setIsAddNoteDialogOpen: (v: boolean) => void;
  setNewQuoteVendorId: (v: string) => void;
  setNewQuoteVendorName: (v: string) => void;
  setNewQuoteEstimatedCost: (v: string) => void;
  setNewQuoteNotes: (v: string) => void;
  setPendingQuoteFiles: (v: Array<{url: string, fileName: string, fileType: string, fileSize: number}>) => void;
  setIsAddQuoteDialogOpen: (v: boolean) => void;
  setNewVendorName: (v: string) => void;
  setNewVendorEmail: (v: string) => void;
  setNewVendorPhone: (v: string) => void;
  setNewVendorAddress: (v: string) => void;
  setNewVendorNotes: (v: string) => void;
  setIsAddVendorDialogOpen: (v: boolean) => void;
}

export function useTaskDetailMutations(deps: MutationDeps) {
  const {
    id, user, task, timeEntries, inventoryItems,
    toast, navigate, safeNavigate,
    quickInventoryName, quickInventoryQuantity, quickInventoryUnit,
    selectedInventoryItemId, partQuantity, partNotes,
    setActiveTimer, setNewMessage,
    setIsEquipmentInfoOpen, setIsVehicleInfoOpen, setIsAddSubTaskDialogOpen,
    setIsStopTimerDialogOpen, setIsHoldReasonDialogOpen, setHoldReason,
    setIsQuickAddInventoryOpen, setSelectedInventoryItemId,
    setQuickInventoryName, setQuickInventoryQuantity, setQuickInventoryUnit,
    setIsAddPartDialogOpen, setPartNotes, setPartQuantity, setInventorySearchQuery,
    setNewNote, setNoteType, setIsAddNoteDialogOpen,
    setNewQuoteVendorId, setNewQuoteVendorName, setNewQuoteEstimatedCost,
    setNewQuoteNotes, setPendingQuoteFiles, setIsAddQuoteDialogOpen,
    setNewVendorName, setNewVendorEmail, setNewVendorPhone,
    setNewVendorAddress, setNewVendorNotes, setIsAddVendorDialogOpen,
  } = deps;

  const addSubTaskMutation = useMutation({
    mutationFn: async (body: { equipmentId?: string; vehicleId?: string; name?: string }) => {
      return await apiRequest("POST", `/api/tasks/${id}/subtasks`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Sub-task created" });
      setIsEquipmentInfoOpen(false);
      setIsVehicleInfoOpen(false);
      setIsAddSubTaskDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/messages/task/${taskId}/mark-read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark messages as read", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", { taskId: id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
      toast({ title: "Message sent" });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message deleted" });
    },
    onError: () => toast({ title: "Failed to delete message", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: newStatus });
      const result = await response.json();
      return { ...result, _requestedStatus: newStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: data?._requestedStatus === "completed" ? "Task completed" : "Status updated" });
      if (data?._requestedStatus === "completed" && task?.parentTaskId) {
        setTimeout(() => safeNavigate(`/tasks/${task.parentTaskId}`), 1200);
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update status", variant: "destructive" });
    },
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: string }) => {
      return apiRequest("PATCH", `/api/tasks/${subtaskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "subtasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update task", variant: "destructive" });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-entries", {
        taskId: id,
        userId: user?.id,
        startTime: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: async (data: TimeEntry) => {
      setActiveTimer(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
      if (task?.status === "not_started" || task?.status === "waiting_approval") {
        try {
          await apiRequest("PATCH", `/api/tasks/${id}/status`, { status: "in_progress" });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        } catch (error) {
          console.error("Error updating task status:", error);
        }
      }
      if (task?.assignedPool && !task?.assignedToId && user?.id) {
        try {
          await apiRequest("PATCH", `/api/tasks/${id}`, {
            assignedToId: user.id,
            assignedPool: null,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        } catch (error) {
          console.error("Error claiming pool task:", error);
        }
      }
      toast({ title: "Timer started" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start timer", variant: "destructive" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async ({ timerId, newStatus, onHoldReason }: { timerId: string, newStatus?: string, onHoldReason?: string }) => {
      const entry = timeEntries.find((e) => e.id === timerId);
      if (!entry?.startTime) return;

      const endTime = new Date();
      const durationMinutes = Math.floor(
        (endTime.getTime() - new Date(entry.startTime).getTime()) / (1000 * 60)
      );

      await apiRequest("PATCH", `/api/time-entries/${timerId}`, {
        endTime: endTime.toISOString(),
        durationMinutes,
      });

      if (newStatus) {
        const payload: any = { status: newStatus };
        if (newStatus === "completed") {
          payload.actualCompletionDate = new Date().toISOString();
        }
        await apiRequest("PATCH", `/api/tasks/${id}`, payload);

        if (newStatus === "on_hold" && onHoldReason) {
          await apiRequest("POST", "/api/task-notes", {
            taskId: id,
            content: `Task placed on hold: ${onHoldReason}`
          });
        }
      }
      return { newStatus };
    },
    onSuccess: (data) => {
      setActiveTimer(null);
      setIsStopTimerDialogOpen(false);
      setIsHoldReasonDialogOpen(false);
      setHoldReason("");
      toast({ title: data?.newStatus === "completed" ? "Task completed" : "Timer stopped" });
      if (data?.newStatus === "completed" && task?.parentTaskId) {
        setTimeout(() => safeNavigate(`/tasks/${task.parentTaskId}`), 1200);
      }
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/time-entries/task", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      }, 300);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to stop timer", variant: "destructive" });
    },
  });

  const quickAddInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!quickInventoryName || quickInventoryQuantity <= 0) {
        throw new Error("Please enter item name and quantity");
      }
      const itemData = {
        name: quickInventoryName,
        quantity: quickInventoryQuantity,
        unit: quickInventoryUnit || undefined,
      };
      const response = await apiRequest("POST", "/api/inventory", itemData);
      return response.json();
    },
    onSuccess: (newItem) => {
      setIsQuickAddInventoryOpen(false);
      setSelectedInventoryItemId(newItem.id);
      setQuickInventoryName("");
      setQuickInventoryQuantity(0);
      setQuickInventoryUnit("");
      toast({ title: "Item created" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }), 300);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to create item", variant: "destructive" }),
  });

  const addPartMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInventoryItemId) throw new Error("Please select an item");
      const selectedItem = inventoryItems?.find(item => item.id === selectedInventoryItemId);
      if (!selectedItem) throw new Error("Item not found");

      const qty = parseFloat(partQuantity);
      const partData = {
        taskId: id,
        inventoryItemId: selectedInventoryItemId,
        partName: selectedItem.name,
        quantity: String(qty),
        cost: selectedItem.cost ? parseFloat(selectedItem.cost) * qty : 0,
        notes: partNotes || undefined,
      };

      const response = await apiRequest("POST", "/api/parts", partData);
      return response.json();
    },
    onSuccess: () => {
      setIsAddPartDialogOpen(false);
      setSelectedInventoryItemId("");
      setPartNotes("");
      setPartQuantity("");
      setInventorySearchQuery("");
      toast({ title: "Part added" });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/parts/task", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      }, 300);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to add part", variant: "destructive" }),
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, noteType }: { content: string, noteType: string }) => {
      return await apiRequest("POST", "/api/task-notes", { taskId: id, content, noteType });
    },
    onSuccess: () => {
      setNewNote("");
      setNoteType("job_note");
      setIsAddNoteDialogOpen(false);
      toast({ title: "Note added" });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] }), 300);
    },
    onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string, content: string }) => {
      const response = await apiRequest("PATCH", `/api/task-notes/${noteId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
    },
    onError: () => toast({ title: "Failed to update note", variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return await apiRequest("DELETE", `/api/task-notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", id] });
      toast({ title: "Note deleted" });
    },
    onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
  });

  const createQuoteMutation = useMutation({
    mutationFn: async ({ vendorName, estimatedCost, notes, files }: { vendorName: string, estimatedCost: number, notes: string, files: Array<{url: string, fileName: string, fileType: string, fileSize: number}> }) => {
      const response = await apiRequest("POST", "/api/quotes", { 
        taskId: id, 
        vendorName: vendorName || null, 
        estimatedCost, 
        notes: notes || null,
        status: "draft",
      });
      const quote = await response.json();
      
      if (files.length > 0 && quote.id) {
        for (const file of files) {
          await apiRequest("POST", `/api/quotes/${quote.id}/attachments`, {
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            storageUrl: file.url,
          });
        }
      }
      
      return quote;
    },
    onSuccess: () => {
      setNewQuoteVendorId("");
      setNewQuoteVendorName("");
      setNewQuoteEstimatedCost("");
      setNewQuoteNotes("");
      setPendingQuoteFiles([]);
      setIsAddQuoteDialogOpen(false);
      toast({ title: "Quote added", description: "The estimate has been added for comparison." });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      }, 300);
    },
    onError: () => toast({ title: "Failed to create quote", variant: "destructive" }),
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Quote approved", description: "The task is now ready to start work." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve quote", variant: "destructive" });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Estimate rejected", description: "The estimate has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject estimate", variant: "destructive" });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "quotes"] });
      toast({ title: "Estimate deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete estimate", variant: "destructive" });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: { name: string; email?: string; phone?: string; address?: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/vendors", vendorData);
      return response.json();
    },
    onSuccess: (newVendor) => {
      setNewQuoteVendorId(newVendor.id);
      setNewQuoteVendorName(newVendor.name);
      setNewVendorName("");
      setNewVendorEmail("");
      setNewVendorPhone("");
      setNewVendorAddress("");
      setNewVendorNotes("");
      setIsAddVendorDialogOpen(false);
      toast({ title: "Vendor created", description: `${newVendor.name} has been added.` });
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/vendors"] }), 300);
    },
    onError: () => toast({ title: "Failed to create vendor", variant: "destructive" }),
  });

  const addUploadMutation = useMutation({
    mutationFn: async ({ fileName, fileType, objectUrl, label }: { fileName: string, fileType: string, objectUrl: string, label?: string }) => {
      const response = await apiRequest("PUT", "/api/uploads", {
        taskId: id,
        fileName,
        fileType,
        objectUrl,
        label,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id, "includeSubtasks"] });
      toast({ title: "File uploaded" });
    },
  });

  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest("DELETE", `/api/uploads/${uploadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", id, "includeSubtasks"] });
      toast({ title: "Attachment deleted" });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not remove attachment", variant: "destructive" });
    },
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      return await apiRequest("PATCH", `/api/checklist-items/${itemId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "checklist-groups"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update checklist item", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", task.projectId, "tasks"] });
      }
      toast({ title: "Task deleted" });
      navigate("/work");
    },
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  return {
    addSubTaskMutation,
    markAsReadMutation,
    sendMessageMutation,
    deleteMessageMutation,
    updateStatusMutation,
    updateSubtaskStatusMutation,
    updateTaskMutation,
    startTimerMutation,
    stopTimerMutation,
    quickAddInventoryMutation,
    addPartMutation,
    addNoteMutation,
    updateNoteMutation,
    deleteNoteMutation,
    createQuoteMutation,
    approveQuoteMutation,
    rejectQuoteMutation,
    deleteQuoteMutation,
    createVendorMutation,
    addUploadMutation,
    deleteUploadMutation,
    toggleChecklistItemMutation,
    deleteTaskMutation,
  };
}
