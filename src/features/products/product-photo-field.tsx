"use client";

import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n/context";

export function ProductPhotoField({
  previewUrl,
  onFile,
  onClear,
}: {
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const shown = localPreview ?? previewUrl;

  function pick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setLocalPreview(URL.createObjectURL(file));
    onFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={pick}
        className="relative flex size-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/40 bg-white/10"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="size-full object-cover" />
        ) : (
          <Camera className="size-10 text-white/70" strokeWidth={1.75} />
        )}
      </button>
      <p className="text-center text-xs text-white/75">{t("app.products.photoHint")}</p>
      {shown && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white/90"
          onClick={() => {
            setLocalPreview(null);
            onClear();
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          <X className="size-3.5" />
          {t("app.products.photoRemove")}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>
  );
}
