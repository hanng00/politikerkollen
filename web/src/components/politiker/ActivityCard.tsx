import { ChevronRight, Vote, MessageSquare, FileText, Flame } from "lucide-react";
import type { Vote as VoteType, Motion, Speech } from "@/types";

type ActivityData = VoteType | Motion | Speech;
type ActivityType = "vote" | "motion" | "speech";

interface ActivityCardProps {
  type: ActivityType;
  data: ActivityData;
  isHot?: boolean;
  onClick?: () => void;
}

function getTypeIcon(type: ActivityType) {
  switch (type) {
    case "vote":
      return <Vote className="size-3.5" />;
    case "speech":
      return <MessageSquare className="size-3.5" />;
    case "motion":
      return <FileText className="size-3.5" />;
  }
}

function getTypeStyles(type: ActivityType) {
  switch (type) {
    case "vote":
      return "bg-chart-1/10 text-chart-1";
    case "speech":
      return "bg-warning/10 text-warning";
    case "motion":
      return "bg-chart-2/10 text-chart-2";
  }
}

export function ActivityCard({ type, data, isHot, onClick }: ActivityCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className={`p-2 rounded-md ${getTypeStyles(type)}`}>
        {getTypeIcon(type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate flex items-center gap-2">
          {data.title}
          {isHot && <Flame className="size-3 text-warning" />}
        </p>
        <p className="text-xs text-muted-foreground">
          {data.date} · {data.topic.name}
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
