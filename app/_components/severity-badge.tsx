import { severities } from "@/lib/domain";
import { tw } from "@/lib/tw";

const severityTone = {
  mild: "tag-verified",
  moderate: "tag-pending",
  severe: "tag-rejected",
} satisfies Record<keyof typeof severities, string>;

export function SeverityBadge({ severity }: { severity: keyof typeof severities }) {
  return <span className={tw(`tag ${severityTone[severity]}`)}>{severities[severity]}</span>;
}
