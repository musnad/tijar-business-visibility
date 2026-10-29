import { describe, expect, it } from "vitest";

import { videoPublicStatus } from "./publish-status";

describe("videoPublicStatus", () => {
  it("maps processing and moderation states without inventing published", () => {
    expect(videoPublicStatus({ status: "draft", moderation_status: "pending", published_at: null })).toBe("Draft");
    expect(videoPublicStatus({ status: "processing", moderation_status: "pending", published_at: null })).toBe(
      "Processing",
    );
    expect(videoPublicStatus({ status: "failed", moderation_status: "pending", published_at: null })).toBe("Failed");
    expect(
      videoPublicStatus({ status: "ready", moderation_status: "pending", published_at: "2026-01-01" }),
    ).toBe("Pending moderation");
    expect(
      videoPublicStatus({ status: "ready", moderation_status: "approved", published_at: "2026-01-01" }),
    ).toBe("Published");
  });
});
