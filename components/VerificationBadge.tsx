import { STATUS_LABEL } from "@/lib/format";
import type { VerificationStatus } from "@/lib/types";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}
