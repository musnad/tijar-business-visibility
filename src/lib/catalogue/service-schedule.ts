import type { PublicProduct } from "@/types/database";

export function serviceLabel(product: Pick<PublicProduct, "kind" | "service_type">): string | null {
  if (product.kind !== "service") return null;
  if (product.service_type === "course") return "Course";
  if (product.service_type === "mentorship") return "Mentorship";
  return "Service";
}

export function formatServiceDates(product: Pick<PublicProduct, "starts_on" | "ends_on">): string | null {
  const start = product.starts_on ? String(product.starts_on).slice(0, 10) : "";
  const end = product.ends_on ? String(product.ends_on).slice(0, 10) : "";
  if (!start && !end) return null;
  if (start && end) return `${start} → ${end}`;
  if (start) return `Starts ${start}`;
  return `Until ${end}`;
}
