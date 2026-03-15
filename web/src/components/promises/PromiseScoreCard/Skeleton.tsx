import { Card, CardContent } from "@/components/ui/card";

export function PromiseScoreCardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Promise skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="h-7 w-full bg-muted rounded animate-pulse" />
            <div className="h-7 w-3/4 bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
        <Card>
          <div className="h-1.5 bg-muted" />
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evidence skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
