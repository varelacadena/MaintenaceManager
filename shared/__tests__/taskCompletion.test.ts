import { describe, expect, it } from "vitest";
import {
  completionPhotoIsRequired,
  hasWorkExplanation,
  isSystemGeneratedNoteContent,
  isWorkExplanationContent,
  missingCompletionPhoto,
  roleRequiresPhotoOnCompletion,
  roleRequiresWorkNoteOnCompletion,
  uploadIsCompletionPhoto,
} from "../taskCompletion";

describe("taskCompletion work notes", () => {
  it("rejects empty, short, and system-generated notes", () => {
    expect(isWorkExplanationContent("")).toBe(false);
    expect(isWorkExplanationContent("   ")).toBe(false);
    expect(isWorkExplanationContent("ok")).toBe(false);
    expect(isWorkExplanationContent("done")).toBe(false);
    expect(isWorkExplanationContent("Claimed by Jane D.")).toBe(false);
    expect(isWorkExplanationContent("Task placed on hold: waiting on parts")).toBe(false);
  });

  it("accepts a real work explanation", () => {
    expect(isWorkExplanationContent("Replaced the belt and tested the unit.")).toBe(true);
    expect(isSystemGeneratedNoteContent("Replaced the belt and tested the unit.")).toBe(false);
  });

  it("ignores recommendations and system notes when checking a task", () => {
    expect(
      hasWorkExplanation([
        { content: "Claimed by Jane D.", noteType: "job_note" },
        { content: "Recommend replacing the unit next year", noteType: "recommendation" },
      ]),
    ).toBe(false);

    expect(
      hasWorkExplanation([
        { content: "Claimed by Jane D.", noteType: "job_note" },
        { content: "Replaced the filter and verified airflow.", noteType: "job_note" },
      ]),
    ).toBe(true);
  });

  it("requires notes from technicians and students, not admins", () => {
    expect(roleRequiresWorkNoteOnCompletion("technician")).toBe(true);
    expect(roleRequiresWorkNoteOnCompletion("student")).toBe(true);
    expect(roleRequiresWorkNoteOnCompletion("admin")).toBe(false);
    expect(roleRequiresWorkNoteOnCompletion("staff")).toBe(false);
  });

  it("requires photos from field roles and recognizes image uploads", () => {
    expect(roleRequiresPhotoOnCompletion("technician")).toBe(true);
    expect(roleRequiresPhotoOnCompletion("admin")).toBe(false);
    expect(uploadIsCompletionPhoto({ fileType: "image/jpeg" })).toBe(true);
    expect(uploadIsCompletionPhoto({ fileType: "application/pdf" })).toBe(false);
  });

  it("always requires a completion photo from technicians, and from students only when the task asks", () => {
    expect(completionPhotoIsRequired({ role: "technician", requiresPhoto: false })).toBe(true);
    expect(completionPhotoIsRequired({ role: "technician", lifeSafetyRound: true })).toBe(false);
    expect(completionPhotoIsRequired({ role: "student", requiresPhoto: true })).toBe(true);
    expect(completionPhotoIsRequired({ role: "student", requiresPhoto: false })).toBe(false);
    expect(completionPhotoIsRequired({ role: "admin", requiresPhoto: true })).toBe(false);
  });

  it("treats any image on the task as the completion photo", () => {
    expect(missingCompletionPhoto({
      role: "technician",
      uploads: [{ fileType: "application/pdf" }],
    })).toBe(true);
    expect(missingCompletionPhoto({
      role: "technician",
      uploads: [{ fileType: "image/jpeg" }],
    })).toBe(false);
  });
});
