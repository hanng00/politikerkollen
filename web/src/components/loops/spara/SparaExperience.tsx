"use client";

import { BellRing, Inbox } from "lucide-react";
import { useMemo } from "react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { useBrokenPromises } from "@/components/loops/loftesmataren";
import { Switch } from "@/components/ui/switch";
import { PARTY_ABBREVS, getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";

import { AlertCard, type AlertItem } from "./AlertCard";
import { FollowButton } from "./FollowButton";
import { useFollows, type FollowTarget } from "./useFollows";

function partyTarget(abbrev: string): FollowTarget {
  return { type: "party", id: `party:${abbrev}`, name: getPartyName(abbrev), party: abbrev };
}

export function SparaExperience() {
  const { targets, alertsEnabled, setAlertsEnabled, hydrated } = useFollows();
  const { feed } = useBrokenPromises();

  const followedPartyAbbrevs = useMemo(
    () =>
      new Set(
        targets
          .filter((t) => t.type === "party")
          .map((t) => t.party.toUpperCase()),
      ),
    [targets],
  );

  const alerts = useMemo<AlertItem[]>(() => {
    if (followedPartyAbbrevs.size === 0) return [];
    return feed
      .filter((f) => followedPartyAbbrevs.has(f.party.toUpperCase()))
      .map((f) => ({
        id: f.id,
        party: f.party,
        text: f.text,
        label: f.label,
        status: f.status,
      }));
  }, [feed, followedPartyAbbrevs]);

  return (
    <div className="page-container-narrow page-section space-y-8">
      <Reveal className="text-center" from="up">
        <div className="mb-3 flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-xl border bg-card">
            <BellRing className="size-5 text-primary" />
          </div>
        </div>
        <h1 className="page-title">Spåra dina politiker</h1>
        <p className="page-subtitle">
          Följ ett parti och få en varning när ett vallöfte bryts. Du kan dela
          varje varning vidare.
        </p>
      </Reveal>

      {/* Alert opt-in */}
      <Reveal from="up" delay={0.05}>
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div>
            <p className="text-sm font-medium">Aviseringar om brutna löften</p>
            <p className="text-xs text-muted-foreground">
              Slå på för att markera nya avvikelser hos dem du följer.
            </p>
          </div>
          <Switch
            checked={alertsEnabled}
            onCheckedChange={setAlertsEnabled}
            aria-label="Aktivera aviseringar"
          />
        </div>
      </Reveal>

      {/* Party grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Välj att spåra</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PARTY_ABBREVS.map((abbrev) => {
            const color = getPartyColor(abbrev);
            return (
              <div
                key={abbrev}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: color, color: needsDarkText(abbrev) ? "#000" : "#fff" }}
                >
                  {abbrev.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{getPartyName(abbrev)}</span>
                <FollowButton target={partyTarget(abbrev)} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Alerts feed */}
      <section aria-live="polite">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          Dina varningar
          {alerts.length > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
              {alerts.length}
            </span>
          )}
        </h2>

        {!hydrated ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : !alertsEnabled ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Slå på aviseringar för att se varningar.
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 p-8 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {followedPartyAbbrevs.size === 0
                ? "Spåra ett parti ovan så dyker varningar upp här."
                : "Inga nya avvikelser hos dem du följer just nu."}
            </p>
          </div>
        ) : (
          <Stagger className="space-y-3">
            {alerts.map((item) => (
              <StaggerItem key={item.id}>
                <AlertCard item={item} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
