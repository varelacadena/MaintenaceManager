export const MIN_WORK_NOTE_LENGTH = 10;

export const WORK_NOTE_REQUIRED_MESSAGE =
  "Add a work note explaining what you did before completing this task.";

export const PHOTO_REQUIRED_MESSAGE =
  "This task requires at least one photo before it can be marked as completed.";

const SYSTEM_NOTE_PREFIXES = ["Task placed on hold:", "Claimed by "];

export function isSystemGeneratedNoteContent(content: string | null | undefined): boolean {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return false;
  return SYSTEM_NOTE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export function isWorkExplanationContent(content: string | null | undefined): boolean {
  const trimmed = (content ?? "").trim();
  if (trimmed.length < MIN_WORK_NOTE_LENGTH) return false;
  return !isSystemGeneratedNoteContent(trimmed);
}

export function isWorkExplanationNote(note: {
  content?: string | null;
  noteType?: string | null;
}): boolean {
  if (note.noteType && note.noteType !== "job_note") return false;
  return isWorkExplanationContent(note.content);
}

export function hasWorkExplanation(
  notes: Array<{ content?: string | null; noteType?: string | null }>,
): boolean {
  return notes.some(isWorkExplanationNote);
}

export function roleRequiresWorkNoteOnCompletion(role: string | undefined | null): boolean {
  return role === "technician" || role === "student";
}

export function roleRequiresPhotoOnCompletion(role: string | undefined | null): boolean {
  return role === "technician" || role === "student";
}

/** Technicians always photograph finished work. Students do when the task asks for it. */
export function completionPhotoIsRequired(input: {
  role?: string | null;
  lifeSafetyRound?: boolean | null;
  requiresPhoto?: boolean | null;
}): boolean {
  if (input.lifeSafetyRound) return false;
  if (input.role === "technician") return true;
  if (input.role === "student") return !!input.requiresPhoto;
  return false;
}

export function missingCompletionPhoto(input: {
  role?: string | null;
  lifeSafetyRound?: boolean | null;
  requiresPhoto?: boolean | null;
  uploads: Array<{ fileType?: string | null }>;
}): boolean {
  if (!completionPhotoIsRequired(input)) return false;
  return !input.uploads.some(uploadIsCompletionPhoto);
}

export function uploadIsCompletionPhoto(upload: { fileType?: string | null }): boolean {
  return (upload.fileType || "").toLowerCase().startsWith("image/");
}
