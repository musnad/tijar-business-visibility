import { cn } from "@/lib/utils";

type TijarLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  /** Tighter width on login/register headers */
  compact?: boolean;
};

/** Official TIJAR logo (transparent PNG, trimmed). */
const LOGO_SRC = "/tijar-logo.png";

export function TijarLogo({ variant = "full", className = "", compact = false }: TijarLogoProps) {
  if (variant === "mark") {
    return (
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden
        className={cn("h-9 w-auto object-contain object-left", className)}
      />
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="TIJAR — Making Every Business Visible"
      width={811}
      height={324}
      className={cn(
        "h-auto w-full object-contain object-left",
        compact ? "max-w-[min(100%,220px)]" : "max-w-[min(100%,300px)]",
        className,
      )}
      decoding="async"
    />
  );
}
