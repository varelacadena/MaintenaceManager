import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  color: "yellow" | "red" | "blue" | "green" | "purple" | "orange";
  isActive: boolean;
  onClick: () => void;
  testId: string;
}

const colorClasses = {
  yellow: {
    bg: "bg-gradient-to-br from-yellow-50 to-yellow-100/80 dark:from-yellow-950/50 dark:to-yellow-900/30",
    border: "border-yellow-200/60 dark:border-yellow-800/40",
    activeBorder: "border-yellow-400 dark:border-yellow-600",
    activeRing: "ring-yellow-400 dark:ring-yellow-600",
    icon: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    countBg: "bg-yellow-500",
  },
  red: {
    bg: "bg-gradient-to-br from-red-50 to-red-100/80 dark:from-red-950/50 dark:to-red-900/30",
    border: "border-red-200/60 dark:border-red-800/40",
    activeBorder: "border-red-400 dark:border-red-600",
    activeRing: "ring-red-400 dark:ring-red-600",
    icon: "bg-red-500/15 text-red-600 dark:text-red-400",
    countBg: "bg-red-500",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-950/50 dark:to-blue-900/30",
    border: "border-blue-200/60 dark:border-blue-800/40",
    activeBorder: "border-blue-400 dark:border-blue-600",
    activeRing: "ring-blue-400 dark:ring-blue-600",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    countBg: "bg-blue-500",
  },
  green: {
    bg: "bg-gradient-to-br from-green-50 to-green-100/80 dark:from-green-950/50 dark:to-green-900/30",
    border: "border-green-200/60 dark:border-green-800/40",
    activeBorder: "border-green-400 dark:border-green-600",
    activeRing: "ring-green-400 dark:ring-green-600",
    icon: "bg-green-500/15 text-green-600 dark:text-green-400",
    countBg: "bg-green-500",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50 to-purple-100/80 dark:from-purple-950/50 dark:to-purple-900/30",
    border: "border-purple-200/60 dark:border-purple-800/40",
    activeBorder: "border-purple-400 dark:border-purple-600",
    activeRing: "ring-purple-400 dark:ring-purple-600",
    icon: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    countBg: "bg-purple-500",
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-50 to-orange-100/80 dark:from-orange-950/50 dark:to-orange-900/30",
    border: "border-orange-200/60 dark:border-orange-800/40",
    activeBorder: "border-orange-400 dark:border-orange-600",
    activeRing: "ring-orange-400 dark:ring-orange-600",
    icon: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    countBg: "bg-orange-500",
  },
};

export default function FilterCard({
  title,
  count,
  icon: Icon,
  color,
  isActive,
  onClick,
  testId,
}: FilterCardProps) {
  const colors = colorClasses[color];

  return (
    <Card
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "relative cursor-pointer transition-all duration-200 overflow-visible",
        "hover:scale-[1.02] active:scale-[0.98]",
        "hover:shadow-md active:shadow-sm",
        colors.bg,
        isActive ? colors.activeBorder : colors.border,
        isActive && "ring-2 ring-offset-2 ring-offset-background",
        isActive && colors.activeRing
      )}
      style={{
        borderWidth: isActive ? "2px" : "1px",
      }}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl", colors.icon)}>
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <div className="text-2xl md:text-3xl font-bold tracking-tight">
              {count}
            </div>
          </div>
        </div>
      </div>
      {isActive && (
        <div
          className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45",
            colors.countBg
          )}
        />
      )}
    </Card>
  );
}
