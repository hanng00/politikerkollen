"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { SiteHeader } from "@/components/layout";
import { topics, constituencies, getConstituencyByPostalCode } from "@/mocks";

export default function VoterGuidePage() {
  const router = useRouter();
  const [postalCode, setPostalCode] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmit = () => {
    const cleaned = postalCode.replace(/\s/g, "");
    if (cleaned.length < 3) {
      setError("Ange ett giltigt postnummer");
      return;
    }

    const constituency = getConstituencyByPostalCode(cleaned);
    if (!constituency) {
      setError("Kunde inte hitta din valkrets");
      return;
    }

    if (selectedTopics.length === 0) {
      setError("Välj minst en fråga");
      return;
    }

    router.push(`/val/${constituency.slug}?topics=${selectedTopics.join(",")}`);
  };

  const handleConstituencyClick = (slug: string) => {
    if (selectedTopics.length === 0) {
      setError("Välj minst en fråga");
      return;
    }
    router.push(`/val/${slug}?topics=${selectedTopics.join(",")}`);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="page-container py-12 md:py-20">
        <div className="max-w-md mx-auto space-y-8">
          {/* Hero - keep it simple */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Vem ska du rösta på?</h1>
            <p className="text-muted-foreground text-sm">
              Se hur kandidaterna i din valkrets faktiskt har röstat.
            </p>
          </div>

          {/* Postal code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Postnummer</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="114 32"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  setError(null);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground">Eller:</span>
              {constituencies.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleConstituencyClick(c.slug)}
                  className="text-primary hover:underline"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Vilka frågor bryr du dig om?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {topics.map((topic) => {
                const selected = selectedTopics.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-md border text-sm text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center",
                        selected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {selected && (
                        <Check className="size-2.5 text-primary-foreground" />
                      )}
                    </div>
                    {topic.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Submit */}
          <Button className="w-full" onClick={handleSubmit}>
            Visa kandidater
            <ChevronRight className="size-4 ml-1" />
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Baserat på offentliga röstningar i riksdagen.
          </p>
        </div>
      </main>
    </div>
  );
}
