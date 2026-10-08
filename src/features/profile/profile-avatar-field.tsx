"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ProfileAvatarField({
  name,
  avatarUrl,
  onFile,
  editLabel,
}: {
  name: string;
  avatarUrl: string | null;
  onFile?: (file: File) => void;
  editLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const shown = localPreview ?? avatarUrl;

  function pick() {
    if (onFile) inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setLocalPreview(URL.createObjectURL(file));
    onFile?.(file);
  }

  const avatarInner = shown ? (
    <img src={shown} alt="" className="size-full object-cover" />
  ) : (
    <span className="text-lg font-extrabold text-primary">{initials(name)}</span>
  );

  return (
    <div className="relative shrink-0">
      {onFile ? (
        <button
          type="button"
          onClick={pick}
          className="relative flex size-[4.5rem] items-center justify-center overflow-hidden rounded-full bg-primary/15 ring-2 ring-primary/20"
          aria-label={editLabel}
        >
          {avatarInner}
        </button>
      ) : (
        <div
          className="relative flex size-[4.5rem] items-center justify-center overflow-hidden rounded-full bg-primary/15 ring-2 ring-primary/20"
          aria-hidden
        >
          {avatarInner}
        </div>
      )}
      <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background">
        <Camera className="size-4" />
      </span>
      {onFile && (
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      )}
    </div>
  );
}
