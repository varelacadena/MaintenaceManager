import { describe, expect, it } from "vitest";
import { groupTaskPhotos, orderedFinishedJobs, photoCountLine } from "../analyticsPdfPhotos";

describe("task photos for the PDF", () => {
  it("keeps the two newest photos and counts the rest", () => {
    const grouped = groupTaskPhotos(
      [
        { taskId: "a", fileName: "old.jpg", label: null, createdAt: "2026-01-01" },
        { taskId: "a", fileName: "mid.jpg", label: "Old pump", createdAt: "2026-02-01" },
        { taskId: "a", fileName: "new.jpg", label: null, createdAt: "2026-03-01" },
        { taskId: "b", fileName: "roof.jpg", label: null, createdAt: "2026-03-02" },
      ],
      ["b", "a"],
    );
    expect(grouped).toEqual([
      { taskId: "b", shown: [expect.objectContaining({ fileName: "roof.jpg" })], total: 1 },
      {
        taskId: "a",
        shown: [expect.objectContaining({ fileName: "new.jpg" }), expect.objectContaining({ fileName: "mid.jpg" })],
        total: 3,
      },
    ]);
  });

  it("describes how many photos were printed", () => {
    expect(photoCountLine(1, 1)).toBe("1 photo on this job.");
    expect(photoCountLine(2, 2)).toBe("2 photos on this job.");
    expect(photoCountLine(2, 3)).toBe("2 of 3 photos. The newest two are printed.");
  });

  it("lists each finished job once, newest completion first", () => {
    const jobs = orderedFinishedJobs([
      { taskId: "old", title: "Old", meta: "", completedAt: "2026-01-01" },
      { taskId: "new", title: "New", meta: "", completedAt: "2026-06-01" },
      { taskId: "new", title: "New again", meta: "", completedAt: "2026-06-01" },
    ]);
    expect(jobs.map((job) => job.taskId)).toEqual(["new", "old"]);
  });
});