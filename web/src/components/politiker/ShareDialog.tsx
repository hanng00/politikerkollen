"use client";

import { useState } from "react";
import { Twitter, Facebook, Link2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Contradiction, Politician } from "@/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contradiction: Contradiction;
  politician: Pick<Politician, "firstName" | "lastName" | "party">;
}

export function ShareDialog({
  open,
  onOpenChange,
  contradiction,
  politician,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const fullName = `${politician.firstName} ${politician.lastName}`;
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;

  const handleCopy = () => {
    // In real implementation, copy actual URL
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Dela motsägelse</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Preview card */}
          <Card className="bg-linear-to-br from-slate-900 to-slate-800 text-white border-0">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium">{fullName}</p>
                  <p className="text-[10px] text-white/60">{politician.party.name}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-warning/20 rounded p-2">
                  <p className="text-[10px] text-warning mb-0.5">SA:</p>
                  <p className="text-xs italic line-clamp-2">
                    &quot;{contradiction.said.content}&quot;
                  </p>
                </div>
                <div className="bg-destructive/20 rounded p-2">
                  <p className="text-[10px] text-destructive mb-0.5">GJORDE:</p>
                  <p className="text-xs line-clamp-2">{contradiction.done.content}</p>
                </div>
              </div>
              <p className="text-[10px] text-white/40 text-center">politikerkollen.se</p>
            </CardContent>
          </Card>

          {/* Share options */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Twitter className="size-4 mr-2" />
              Twitter
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Facebook className="size-4 mr-2" />
              Facebook
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
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
            <Button variant="outline" size="sm" className="h-9">
              <Download className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
