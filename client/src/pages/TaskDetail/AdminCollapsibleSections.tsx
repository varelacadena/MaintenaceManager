import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Clock,
  User,
  Calendar,
  Plus,
  Package,
  ExternalLink,
  Trash2,
  Paperclip,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  StickyNote,
  History,
  Check,
  ListChecks,
  CircleDollarSign,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import { statusColors, quoteStatusColors } from "./constants";
import { QuoteAttachmentsList } from "./helpers";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminCollapsibleSections({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, navigate, toast, downloadFile,
    timeEntries, parts, notes, users, uploads,
    requestAttachments, checklistGroups, messages, quotes,
    previousWork,
    newMessage, setNewMessage,
    activeTimer,
    previousWorkExpanded, setPreviousWorkExpanded,
    notesExpanded, setNotesExpanded,
    messagesExpanded, setMessagesExpanded,
    attachmentsExpanded, setAttachmentsExpanded,
    checklistExpanded, setChecklistExpanded,
    partsExpanded, setPartsExpanded,
    quotesExpanded, setQuotesExpanded,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    isAddQuoteDialogOpen, setIsAddQuoteDialogOpen,
    isAddNoteDialogOpen, setIsAddNoteDialogOpen,
    messagesEndRef, messagesSectionRef, partsSectionRef,
    sendMessageMutation, deleteMessageMutation,
    deleteNoteMutation, deleteUploadMutation,
    approveQuoteMutation, rejectQuoteMutation, deleteQuoteMutation,
    toggleChecklistItemMutation, getUploadParameters,
    isTechnicianOrAdmin, property,
    totalChecklistItems, completedChecklistItems,
    estimateBlocksCompletion,
  } = ctx;

  if (!task) return null;

  return (
    <>
      {isTechnicianOrAdmin && previousWork.length > 0 && (
        <Collapsible open={previousWorkExpanded} onOpenChange={setPreviousWorkExpanded}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-md text-left" data-testid="toggle-previous-work">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm">Previous Work Here</span>
                <Badge variant="secondary" className="text-xs">{previousWork.length}</Badge>
              </div>
              {previousWorkExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {previousWork.map((prevTask) => {
              const completedBy = users.find(u => u.id === prevTask.assignedToId);
              const isEquipmentMatch = task.equipmentId && prevTask.equipmentId === task.equipmentId;
              return (
                <div
                  key={prevTask.id}
                  className="p-3 rounded-md border border-border/50 cursor-pointer hover-elevate"
                  onClick={() => navigate(`/tasks/${prevTask.id}`)}
                  data-testid={`previous-work-item-${prevTask.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{prevTask.name}</p>
                      {prevTask.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{prevTask.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {completedBy && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {completedBy.firstName} {completedBy.lastName}
                          </span>
                        )}
                        {prevTask.updatedAt && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {isEquipmentMatch && (
                          <Badge variant="outline" className="text-xs">Same Equipment</Badge>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {checklistGroups.length > 0 && (
        <Collapsible open={checklistExpanded} onOpenChange={setChecklistExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-checklist">
              <div className="flex items-center gap-3">
                <ListChecks className="w-5 h-5 text-primary" />
                <span className="font-medium">Checklists</span>
                <Badge variant="secondary">{completedChecklistItems}/{totalChecklistItems}</Badge>
              </div>
              {checklistExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-4">
            {checklistGroups.map((group) => (
              <div key={group.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                <p className="font-medium text-sm">{group.name}</p>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-background rounded-lg cursor-pointer hover-elevate active-elevate-2 min-h-[56px]"
                    onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <Checkbox checked={item.isCompleted} className="w-6 h-6" />
                    <span className={`text-base flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-notes">
            <div className="flex items-center gap-3">
              <StickyNote className="w-5 h-5 text-primary" />
              <span className="font-medium">Notes</span>
              {notes.length > 0 && <Badge variant="secondary">{notes.length}</Badge>}
            </div>
            {notesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {notes.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">No notes yet</p>
          ) : (
            notes.map((note) => {
              const noteUser = users.find(u => u.id === note.userId);
              const canDelete = user?.role === "admin" || note.userId === user?.id;
              return (
                <div key={note.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{noteUser?.firstName} {noteUser?.lastName}</span>
                      <Badge variant="outline" className="text-xs py-0">
                        {note.noteType === "job_note" ? "Note" : "Recommendation"}
                      </Badge>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </p>
                </div>
              );
            })
          )}
        </CollapsibleContent>
      </Collapsible>

      {(() => {
        const myEntries = timeEntries.filter(e => e.userId === user?.id);
        const entriesToShow = isTechnicianOrAdmin ? timeEntries : myEntries;
        
        if (entriesToShow.length === 0) return null;
        
        return (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <History className="w-5 h-5 text-primary" />
              <span className="font-medium">{isTechnicianOrAdmin ? "Time Log" : "My Time Log"}</span>
            </div>
            <div className="space-y-2">
              {entriesToShow.slice(0, 5).map((entry) => {
                const entryUser = users.find(u => u.id === entry.userId);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-background rounded-md" data-testid={`time-entry-${entry.id}`}>
                    <div className="flex-1">
                      <p className="text-sm">
                        {entry.startTime ? format(new Date(entry.startTime), "MMM d, h:mm a") : "No start time"}
                      </p>
                      {isTechnicianOrAdmin && entryUser && (
                        <p className="text-xs text-muted-foreground">
                          {entryUser.firstName} {entryUser.lastName}
                        </p>
                      )}
                    </div>
                    {entry.durationMinutes ? (
                      <Badge variant="secondary">{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</Badge>
                    ) : (
                      <Badge variant="default" className="animate-pulse">Running</Badge>
                    )}
                  </div>
                );
              })}
              {entriesToShow.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  +{entriesToShow.length - 5} more entries
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {isTechnicianOrAdmin && (
        <Collapsible open={messagesExpanded} onOpenChange={setMessagesExpanded}>
          <CollapsibleTrigger asChild>
            <div ref={messagesSectionRef} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-messages">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="font-medium">Messages</span>
                {messages.length > 0 && <Badge variant="secondary">{messages.length}</Badge>}
              </div>
              {messagesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No messages yet</p>
            ) : (
              messages.map((message) => {
                const sender = users.find(u => u.id === message.senderId);
                const isOwnMessage = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${isOwnMessage ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{sender?.firstName} {sender?.lastName}</span>
                      {user?.role === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteMessageMutation.mutate(message.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.createdAt && formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                );
              })
            )}
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMessage.trim()) {
                    sendMessageMutation.mutate(newMessage.trim());
                  }
                }}
                data-testid="input-message"
              />
              <Button
                size="icon"
                onClick={() => newMessage.trim() && sendMessageMutation.mutate(newMessage.trim())}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-attachments">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-primary" />
              <span className="font-medium">Attachments</span>
              {(uploads.length + requestAttachments.length) > 0 && (
                <Badge variant="secondary">{uploads.length + requestAttachments.length}</Badge>
              )}
            </div>
            {attachmentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {requestAttachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">From Request</p>
              {requestAttachments.map((att) => {
                const isMockFile = att.objectUrl.includes("mock-storage.local");
                return (
                  <button
                    key={att.id}
                    onClick={() => downloadFile(att.id, att.objectUrl)}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate w-full text-left"
                  >
                    {isMockFile ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm flex-1 truncate">{att.fileName}</span>
                    {isMockFile ? (
                      <span className="text-xs text-destructive">Unavailable</span>
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {uploads.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Task Attachments</p>
              {uploads.map((upload) => {
                const isMockFile = upload.objectUrl.includes("mock-storage.local");
                return (
                  <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <button
                      onClick={() => downloadFile(upload.id, upload.objectUrl)}
                      className="flex items-center gap-3 flex-1 min-w-0 hover-elevate text-left"
                    >
                      {isMockFile ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm truncate">{upload.fileName}</span>
                      {isMockFile && (
                        <span className="text-xs text-destructive">Unavailable</span>
                      )}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUploadMutation.mutate(upload.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
          {uploads.length === 0 && requestAttachments.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No attachments</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {task?.requiresEstimate && isTechnicianOrAdmin && (
        <Collapsible open={quotesExpanded} onOpenChange={setQuotesExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-quotes">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="w-5 h-5 text-primary" />
                <span className="font-medium">Estimates</span>
                {quotes.length > 0 && <Badge variant="secondary">{quotes.length}</Badge>}
                {task?.estimateStatus === "needs_estimate" && (
                  <Badge variant="outline" className={statusColors.needs_estimate}>Needs Estimate</Badge>
                )}
                {task?.estimateStatus === "waiting_approval" && (
                  <Badge variant="outline" className={statusColors.waiting_approval}>Pending Review</Badge>
                )}
                {task?.estimateStatus === "approved" && (
                  <Badge variant="outline" className={statusColors.ready}>Approved</Badge>
                )}
              </div>
              {quotesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {task?.estimateStatus !== "approved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddQuoteDialogOpen(true)}
                className="w-full"
                data-testid="button-add-quote"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Estimate
              </Button>
            )}

            {quotes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                No estimates added yet. Add estimates to compare and approve before work begins.
              </p>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => {
                  const quoteCreator = users.find(u => u.id === quote.createdById);
                  const isOwnQuote = user?.id === quote.createdById;
                  const canModify = user?.role === "admin" || isOwnQuote;

                  return (
                    <div
                      key={quote.id}
                      className={`p-4 rounded-lg border ${
                        quote.status === "approved" ? "border-green-500/50 bg-green-500/5" : 
                        quote.status === "rejected" ? "border-red-500/30 bg-red-500/5 opacity-60" : 
                        "border-border"
                      }`}
                      data-testid={`quote-card-${quote.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold text-lg">
                              ${(quote.estimatedCost || 0).toLocaleString()}
                            </span>
                            <Badge variant="secondary" className={quoteStatusColors[quote.status]}>
                              {quote.status}
                            </Badge>
                          </div>
                          {quote.vendorName && (
                            <p className="text-sm text-muted-foreground">
                              Vendor: {quote.vendorName}
                            </p>
                          )}
                          {quoteCreator && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted by {quoteCreator.firstName && quoteCreator.lastName ? `${quoteCreator.firstName} ${quoteCreator.lastName}` : quoteCreator.username}
                            </p>
                          )}
                          {quote.notes && (
                            <p className="text-sm mt-2">{quote.notes}</p>
                          )}
                          <QuoteAttachmentsList quoteId={quote.id} />
                        </div>
                        <div className="flex gap-2">
                          {quote.status === "draft" && task?.estimateStatus !== "approved" && (
                            <>
                              {user?.role === "admin" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => approveQuoteMutation.mutate(quote.id)}
                                    disabled={approveQuoteMutation.isPending}
                                    data-testid={`button-approve-quote-${quote.id}`}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => rejectQuoteMutation.mutate(quote.id)}
                                    disabled={rejectQuoteMutation.isPending}
                                    data-testid={`button-reject-quote-${quote.id}`}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {canModify && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteQuoteMutation.mutate(quote.id)}
                                  disabled={deleteQuoteMutation.isPending}
                                  data-testid={`button-delete-quote-${quote.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                          {quote.status === "approved" && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {isTechnicianOrAdmin && (
        <Collapsible open={partsExpanded} onOpenChange={setPartsExpanded}>
          <CollapsibleTrigger asChild>
            <div ref={partsSectionRef} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-parts">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <span className="font-medium">Parts Used</span>
                {parts.length > 0 && <Badge variant="secondary">{parts.length}</Badge>}
              </div>
              {partsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {parts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No parts used</p>
            ) : (
              parts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{part.partName}</p>
                    {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Qty: {part.quantity}</p>
                    <p className="text-xs text-muted-foreground">${part.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddPartDialogOpen(true)}
              data-testid="button-add-part"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
