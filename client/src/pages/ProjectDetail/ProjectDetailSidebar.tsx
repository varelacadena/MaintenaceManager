import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trash2, Plus, Paperclip, FileIcon, Download, Image as ImageIcon, Send,
} from "lucide-react";
import type { Project, ProjectComment, Upload } from "@shared/schema";
import type { UseMutationResult } from "@tanstack/react-query";
import { format } from "date-fns";
import { getAvatarColor } from "@/utils/taskUtils";

interface ProjectDetailSidebarProps {
  project: Project;
  isOverdue: boolean | "" | null | undefined;
  getPropertyName: (propertyId: string | null) => string | null | undefined;
  rightTab: string;
  setRightTab: (tab: string) => void;
  comments?: ProjectComment[];
  commentsByDate: Record<string, ProjectComment[]>;
  getSenderInfo: (senderId: string) => { name: string; initials: string };
  getCommentAttachments: (commentId: string) => Upload[];
  getImageUrl: (upload: Upload) => string;
  commentText: string;
  setCommentText: (text: string) => void;
  handleCommentSubmit: () => void;
  handleFileAttachToComment: () => void;
  handleDirectFileUpload: () => void;
  addCommentMutation: UseMutationResult<any, any, any, any>;
  activityEndRef: React.RefObject<HTMLDivElement>;
  projectUploads?: Upload[];
  imageUploads: Upload[];
  fileUploads: Upload[];
  setDeleteDialogOpen: (open: boolean) => void;
}

export function ProjectDetailSidebar({
  project, isOverdue, getPropertyName,
  rightTab, setRightTab,
  comments, commentsByDate, getSenderInfo, getCommentAttachments, getImageUrl,
  commentText, setCommentText, handleCommentSubmit, handleFileAttachToComment, handleDirectFileUpload,
  addCommentMutation, activityEndRef,
  projectUploads, imageUploads, fileUploads,
  setDeleteDialogOpen,
}: ProjectDetailSidebarProps) {
  return (
    <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 space-y-4">
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-details-heading">Details</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium text-right" data-testid="text-detail-property">{getPropertyName(project.propertyId) || "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Start</span>
              <span className="font-medium" data-testid="text-detail-start">
                {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Due</span>
              <span className={`font-medium ${isOverdue ? "text-red-500 dark:text-red-400" : ""}`} data-testid="text-detail-due">
                {project.targetEndDate ? format(new Date(project.targetEndDate), "MMM d, yyyy") : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium" data-testid="text-detail-budget">${(project.budgetAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={rightTab} onValueChange={setRightTab}>
        <TabsList className="w-full">
          <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="files" className="flex-1" data-testid="tab-files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-3">
          <div className="border rounded-md">
            <div className="max-h-[450px] overflow-y-auto p-3 space-y-4" data-testid="activity-feed">
              {(!comments || comments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              )}
              {Object.entries(commentsByDate).map(([date, dateComments]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">{date}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {dateComments.map((comment) => {
                    const sender = getSenderInfo(comment.senderId);
                    if (comment.isSystem) {
                      return (
                        <div key={comment.id} className="flex items-center gap-2 py-1.5" data-testid={`comment-system-${comment.id}`}>
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">SYS</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{comment.content}</span>
                        </div>
                      );
                    }
                    const attachments = getCommentAttachments(comment.id);
                    return (
                      <div key={comment.id} className="flex gap-2 py-1.5" data-testid={`comment-${comment.id}`}>
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className={`${getAvatarColor(comment.senderId)} text-white text-xs font-medium`}>
                            {sender.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-sm">{sender.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt ? format(new Date(comment.createdAt), "h:mm a") : ""}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
                          {attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {attachments.map((att) => (
                                att.fileType?.startsWith("image/") ? (
                                  <a
                                    key={att.id}
                                    href={getImageUrl(att)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block max-w-[200px] rounded-md overflow-hidden border"
                                    data-testid={`comment-image-${att.id}`}
                                  >
                                    <img
                                      src={getImageUrl(att)}
                                      alt={att.fileName}
                                      className="w-full object-cover"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    key={att.id}
                                    href={getImageUrl(att)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-1.5 rounded-md border text-xs hover-elevate"
                                    data-testid={`comment-file-${att.id}`}
                                  >
                                    <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="truncate">{att.fileName}</span>
                                    <Download className="w-3 h-3 text-muted-foreground shrink-0" />
                                  </a>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={activityEndRef} />
            </div>
            <div className="border-t p-2 flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={handleFileAttachToComment} data-testid="button-attach-file">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Comment..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
                data-testid="input-comment"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                data-testid="button-send-comment"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-3">
          <div className="border rounded-md p-3 space-y-4" data-testid="files-section">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium">Files & Photos</h4>
              <Button size="sm" variant="outline" onClick={handleDirectFileUpload} data-testid="button-upload-file">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
            </div>

            {(!projectUploads || projectUploads.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No files uploaded yet</p>
            )}

            {imageUploads.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Photos ({imageUploads.length})
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {imageUploads.map((upload) => (
                    <a
                      key={upload.id}
                      href={getImageUrl(upload)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-md overflow-hidden border hover-elevate"
                      data-testid={`image-upload-${upload.id}`}
                    >
                      <img
                        src={getImageUrl(upload)}
                        alt={upload.fileName}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {fileUploads.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileIcon className="w-3.5 h-3.5" />
                  Files ({fileUploads.length})
                </div>
                <div className="space-y-1">
                  {fileUploads.map((upload) => (
                    <a
                      key={upload.id}
                      href={getImageUrl(upload)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md hover-elevate text-sm group"
                      data-testid={`file-upload-${upload.id}`}
                    >
                      <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{upload.fileName}</span>
                      <Download className="w-3.5 h-3.5 text-muted-foreground invisible group-hover:visible shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setDeleteDialogOpen(true)}
        data-testid="button-delete-project"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Project
      </Button>
    </div>
  );
}
