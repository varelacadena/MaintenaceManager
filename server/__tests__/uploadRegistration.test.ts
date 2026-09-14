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

vi.mock("../routeUtils", () => ({
  canAccessServiceRequest: vi.fn(),
}));

import { registerUpload, registerPublicRequestUpload } from "../uploadRegistration";

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

  it("rejects object paths outside uploads/", async () => {
    const result = await registerUpload("user-1", {
      taskId: "task-1",
      fileName: "photo.jpg",
      fileType: "image/jpeg",
      objectUrl: "https://example.com/photo.jpg",
      objectPath: "../secret",
    });

    expect(result.error?.status).toBe(400);
    expect(mocks.storage.createUpload).not.toHaveBeenCalled();
  });
});

describe("registerPublicRequestUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBucketId.mockReturnValue("private-bucket");
    mocks.getDownloadUrl.mockResolvedValue("https://signed.example/download");
    mocks.storage.createUpload.mockImplementation(async (data: unknown) => ({
      id: "upload-public",
      ...(data as object),
      createdAt: new Date(),
    }));
  });

  it("attaches a photo to a service request without a user", async () => {
    const result = await registerPublicRequestUpload("req-1", "Alex Rivera", {
      fileName: "leak.jpg",
      fileType: "image/jpeg",
      objectUrl: "https://example.com/leak.jpg",
      objectPath: "uploads/leak.jpg",
    });

    expect(result.error).toBeUndefined();
    expect(mocks.storage.createUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-1",
        uploadedById: null,
        uploadedByName: "Alex Rivera",
        objectPath: "uploads/leak.jpg",
        objectUrl: "https://signed.example/download",
      })
    );
  });
});
