import { describe, expect, it } from "vitest";

import { sniffVideoKind, validateVideoFileMeta, MAX_VIDEO_BYTES } from "./file-guard";

function bytes(arr: number[]): Uint8Array {
  return Uint8Array.from(arr);
}

describe("sniffVideoKind", () => {
  it("detects MP4 ftyp box even if the declared type is wrong", () => {
    const header = bytes([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    expect(sniffVideoKind(header)).toBe("mp4");
  });

  it("detects WebM EBML header", () => {
    const header = bytes([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(sniffVideoKind(header)).toBe("webm");
  });

  it("rejects a renamed jpeg", () => {
    const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffVideoKind(jpeg)).toBeNull();
  });
});

describe("validateVideoFileMeta", () => {
  it("rejects empty and oversized files", () => {
    expect(validateVideoFileMeta({ size: 0 } as File).ok).toBe(false);
    expect(validateVideoFileMeta({ size: MAX_VIDEO_BYTES + 1 } as File).ok).toBe(false);
    expect(validateVideoFileMeta({ size: 1024 } as File).ok).toBe(true);
  });
});
