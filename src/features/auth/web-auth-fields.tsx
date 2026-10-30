"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { GoogleAuthButton } from "@/features/auth/auth-ui";
import { cn } from "@/lib/utils";

export function WebAuthField({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  trailing,
  autoComplete,
  className,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  trailing?: ReactNode;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-[#0B1F4D]">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#64748b]"
          aria-hidden
        />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="web-auth-input min-h-[48px] w-full rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] py-3 pl-11 pr-11 text-base text-[#0B1F4D] outline-none transition placeholder:text-[#94a3b8] focus:border-[#1F7A4D] focus:bg-white focus:ring-2 focus:ring-[#1F7A4D]/20 sm:min-h-[50px] sm:text-sm"
        />
        {trailing && <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">{trailing}</div>}
      </div>
    </div>
  );
}

export function WebAuthSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  options,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-[#0B1F4D]">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#64748b]"
          aria-hidden
        />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="web-auth-input min-h-[48px] w-full appearance-none rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] py-3 pl-11 pr-10 text-base text-[#0B1F4D] outline-none focus:border-[#1F7A4D] focus:bg-white focus:ring-2 focus:ring-[#1F7A4D]/20 sm:min-h-[50px] sm:text-sm"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function WebPrimaryButton({
  loading,
  variant = "green",
  children,
}: {
  loading?: boolean;
  variant?: "green" | "navy";
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white shadow-sm transition-opacity disabled:opacity-60 sm:min-h-[50px] sm:text-sm",
        variant === "green" ? "bg-[#1F7A4D] hover:bg-[#1a6a43]" : "bg-[#0B1F4D] hover:bg-[#081638]",
      )}
    >
      {children}
    </button>
  );
}

export { GoogleAuthButton };
