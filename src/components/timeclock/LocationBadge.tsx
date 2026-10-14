import { Home, MapPin } from "lucide-react";
import { punchLocationStatus, type PunchCell } from "@/lib/timeclock";

export function LocationBadge({ cell }: { cell: PunchCell }) {
  const status = punchLocationStatus(cell);
  const verified = status.kind === "inside" || status.kind === "remote";
  const style = verified ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : status.kind === "outside" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : "bg-ink-100 text-ink-500";
  const Icon = status.kind === "remote" ? Home : MapPin;
  return <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style}`}>
    <Icon className="size-2.5 shrink-0" />{status.label}
  </span>;
}
