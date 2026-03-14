"use client";

import { Check, Facebook, Link2, Twitter } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";
import { getNarrative } from "@/lib/promise-narratives";
import type { PromiseScore } from "@/types";

interface PromiseShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promise: PromiseScore;
}

export function PromiseShareDialog({
  open,
  onOpenChange,
  promise,
}: PromiseShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const partyColor = getPartyColor(promise.promise_party);
  const partyName = getPartyName(promise.promise_party);
  const darkText = needsDarkText(promise.promise_party);
  const narrative = getNarrative(promise);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/loften/${promise.promise_id}`
      : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedPromise =
    promise.promise_text.length > 80
      ? `${promise.promise_text.slice(0, 80)}…`
      : promise.promise_text;

  const shareText = `${partyName} lovade: "${truncatedPromise}"\n\n${narrative}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Dela löfte</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="px-4 py-2" style={{ backgroundColor: partyColor }}>
              <span
                className={`text-xs font-semibold ${darkText ? "text-gray-900" : "text-white"}`}
              >
                {partyName} · Valmanifest {promise.promise_year}
              </span>
            </div>
            <CardContent className="py-3 space-y-2">
              <p className="text-sm font-serif leading-relaxed line-clamp-3">
                &ldquo;{promise.promise_text}&rdquo;
              </p>
              <Separator />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {narrative}
              </p>
            </CardContent>
            <div className="px-4 pb-2">
              <p className="text-[10px] text-muted-foreground/50 text-center">
                politikerkollen.org
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Twitter className="size-4" />
              Twitter
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Facebook className="size-4" />
              Facebook
            </a>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="size-4 mr-2" />
                Kopierad!
              </>
            ) : (
              <>
                <Link2 className="size-4 mr-2" />
                Kopiera länk
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
