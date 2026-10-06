type TijarLogoProps = {
  variant?: "full" | "mark";
  className?: string;
};

const LOGO_SRC = "/tijar-logo.png";

export function TijarLogo({ variant = "full", className = "" }: TijarLogoProps) {
  if (variant === "mark") {
    return (
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden
        className={`h-9 w-9 object-contain object-left ${className}`}
      />
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="TIJAR — Making Every Business Visible"
      className={`h-auto w-full max-w-[min(100%,22rem)] object-contain object-left ${className}`}
      width={640}
      height={360}
    />
  );
}
