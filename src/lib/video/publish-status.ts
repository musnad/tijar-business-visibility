export function videoPublicStatus(row: {
  status: string;
  moderation_status: string;
  published_at: string | null;
}): string {
  if (row.status === "draft" || row.status === "uploading") return "Draft";
  if (row.status === "processing") return "Processing";
  if (row.status === "failed") return "Failed";
  if (row.status === "rejected" || row.moderation_status === "flagged" || row.moderation_status === "suspended") {
    return "Rejected";
  }
  if (row.status === "ready" && row.moderation_status === "pending") return "Pending moderation";
  if (row.status === "ready" && row.moderation_status === "approved" && row.published_at) return "Published";
  if (row.status === "ready") return "Submitted";
  return row.status;
}
