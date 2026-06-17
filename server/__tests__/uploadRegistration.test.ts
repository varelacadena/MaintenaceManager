import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getDownloadUrl: vi.fn(),
  getBucketId: vi.fn(),
  storage: {
    getUser: vi.fn(),
    getTask: vi.fn(),
    isTaskHelper: vi.fn(),
    createUpload: vi.fn(),
  },
  canAccessTask: vi.fn(),
}));

vi.mock("../objectStorage", () => ({
  getDownloadUrl: (...args: unknown[]) => mocks.getDownloadUrl(...args),
  getBucketId: () => mocks.getBucketId(),
}));

vi.mock("../storage", () => ({
  storage: mocks.storage,
}));

vi.mock("../middleware", () => ({
  canAccessTask: (...args: unknown[]) => mocks.canAccessTask(...args),
}));

import { registerUpload } from "../uploadRegistration";

describe("registerUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBucketId.mockReturnValue("private-bucket");
    mocks.getDownloadUrl.mockResolvedValue("https://signed.example/download");
    mocks.storage.getUser.mockResolvedValue({ id: "user-1", role: "technician" });
    mocks.storage.getTask.mockResolvedValue({ id: "task-1", assignedToId: "user-1" });
    mocks.canAccessTask.mockResolvedValue(true);
    mocks.storage.createUpload.mockImplementation(async (data: unknown) => ({
      id: "upload-1",
      ...(data as object),
      createdAt: new Date(),
    }));
  });

  it("requires parent record", async () => {
    const result = await registerUpload("user-1", {
      fileName: "a.jpg",
      fileType: "image/jpeg",
      objectUrl: "https://example.com/a.jpg",
    });
    expect(result.error?.status).toBe(400);
  });

  it("stores objectPath and resolves objectUrl from storage when configured", async () => {
    const result = await registerUpload("user-1", {
      taskId: "task-1",
      fileName: "photo.jpg",
      fileType: "image/jpeg",
      objectUrl: "https://project.supabase.co/storage/v1/object/upload/sign/bucket/uploads/x",
      objectPath: "uploads/photo.jpg",
    });

    expect(result.error).toBeUndefined();
    expect(mocks.getDownloadUrl).toHaveBeenCalledWith("uploads/photo.jpg");
    expect(mocks.storage.createUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        objectPath: "uploads/photo.jpg",
        objectUrl: "https://signed.example/download",
        uploadedById: "user-1",
      })
    );
  });

  it("denies task upload when user lacks access", async () => {
    mocks.storage.getUser.mockResolvedValue({ id: "user-2", role: "technician" });
    mocks.canAccessTask.mockResolvedValue(false);

    const result = await registerUpload("user-2", {
      taskId: "task-1",
      fileName: "photo.jpg",
      fileType: "image/jpeg",
      objectUrl: "https://example.com/photo.jpg",
      objectPath: "uploads/photo.jpg",
    });

    expect(result.error?.status).toBe(403);
  });
});
