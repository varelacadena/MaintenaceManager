import { Badge } from "@/components/ui/badge";

type UrgencyLevel = "low" | "medium" | "high";

interface UrgencyBadgeProps {
  level: UrgencyLevel;
}

const urgencyConfig = {
  low: { label: "Low", className: "bg-urgency-low/10 text-urgency-low border-urgency-low/20" },
  medium: { label: "Medium", className: "bg-urgency-medium/10 text-urgency-medium border-urgency-medium/20" },
  high: { label: "High", className: "bg-urgency-high/10 text-urgency-high border-urgency-high/20" },
};

export default function UrgencyBadge({ level }: UrgencyBadgeProps) {
  const config = urgencyConfig[level];
  return (
    <Badge variant="outline" className={config.className} data-testid={`badge-urgency-${level}`}>
      {config.label}
    </Badge>
  );
}
