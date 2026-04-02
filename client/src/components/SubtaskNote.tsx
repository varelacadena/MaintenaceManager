import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaskNote } from "@shared/schema";

interface SubtaskNoteProps {
  subtaskId: string;
  disabled: boolean;
  testIdPrefix?: string;
}

export function SubtaskNote({ subtaskId, disabled, testIdPrefix = "subtask" }: SubtaskNoteProps) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [isSaved, setIsSaved] = useState(true);

  const { data: notes } = useQuery<TaskNote[]>({
    queryKey: ["/api/task-notes/task", subtaskId],
    queryFn: async () => {
      const res = await fetch(`/api/task-notes/task/${subtaskId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!subtaskId,
  });

  const latestNote = notes?.[notes.length - 1];

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/task-notes", {
        taskId: subtaskId,
        content,
        noteType: "job_note",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-notes/task", subtaskId] });
      setIsSaved(true);
    },
    onError: () => {
      toast({ title: "Failed to save note", variant: "destructive" });
    },
  });

  const displayValue = !isSaved ? noteText : (latestNote?.content ?? "");

  return (
    <div className="relative">
      <Textarea
        placeholder="Add a note..."
        className="text-xs resize-none border focus-visible:ring-1 focus-visible:ring-[#4338CA]"
        style={{ borderColor: "#EEEEEE", minHeight: "60px" }}
        disabled={disabled}
        value={displayValue}
        onChange={(e) => {
          setNoteText(e.target.value);
          setIsSaved(false);
        }}
        onBlur={() => {
          const val = noteText.trim();
          if (!isSaved && val && val !== (latestNote?.content ?? "")) {
            saveNoteMutation.mutate(val);
          } else {
            setIsSaved(true);
          }
        }}
        data-testid={`${testIdPrefix}-note-${subtaskId}`}
      />
      {saveNoteMutation.isPending && (
        <span className="absolute bottom-1 right-2 text-xs" style={{ color: "#9CA3AF" }}>Saving...</span>
      )}
    </div>
  );
}
