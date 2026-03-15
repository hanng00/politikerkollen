import type { PromiseScore } from "@/types";

import { PromiseSection } from "./PromiseSection";
import { SummarySection } from "./SummarySection";
import { EvidenceSection } from "./EvidenceSection";
import { ContextSection } from "./ContextSection";
import { MethodologySection } from "./MethodologySection";

export { PromiseScoreCardSkeleton } from "./Skeleton";

export function PromiseScoreCard({ score }: { score: PromiseScore }) {
  return (
    <div className="space-y-8">
      <PromiseSection score={score} />
      <SummarySection score={score} />
      <EvidenceSection score={score} />
      <ContextSection score={score} />
      <MethodologySection />
    </div>
  );
}
