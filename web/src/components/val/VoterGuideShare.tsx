"use client";

import { useState } from "react";
import { Twitter, Facebook, Link2, Check, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Constituency } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  constituency: Constituency;
  topCandidateName: string;
  selectedTopics: string[];
}

export function VoterGuideShare({
  open,
  onOpenChange,
  constituency,
  topCandidateName,
}: Props) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `Kollade mina kandidater i ${constituency.name}. ${topCandidateName} matchade bäst. Se dina:`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = (platform: "twitter" | "facebook" | "whatsapp") => {
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    };
    window.open(urls[platform], "_blank", "width=550,height=420");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dela</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="flex-col h-auto py-3 gap-1"
            onClick={() => share("twitter")}
          >
            <Twitter className="size-4" />
            <span className="text-[10px]">Twitter</span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 gap-1"
            onClick={() => share("facebook")}
          >
            <Facebook className="size-4" />
            <span className="text-[10px]">Facebook</span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 gap-1"
            onClick={() => share("whatsapp")}
          >
            <MessageCircle className="size-4" />
            <span className="text-[10px]">WhatsApp</span>
          </Button>
        </div>

        <div className="flex gap-2">
          <Input value={url} readOnly className="text-xs" />
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
