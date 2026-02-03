interface StepSeparatorProps {
  stepIndex: number;
}

export function StepSeparator({ stepIndex }: StepSeparatorProps) {
  if (stepIndex === 0) return null;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-border/40" />
      <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">
        Steg {stepIndex + 1}
      </span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}
