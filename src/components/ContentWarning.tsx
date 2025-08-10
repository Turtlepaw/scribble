"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { type ModerationOpts } from "@atproto/api/dist/moderation/types";
import { useModerationStore } from "@/lib/stores/moderation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ModerationDecision } from "@atproto/api";

interface ContentWarningProps {
  mod: ModerationDecision;
  children: React.ReactNode;
  className?: string;
}

export function ContentWarning({
  mod,
  children,
  className,
}: ContentWarningProps) {
  const modUi = mod.ui("contentMedia");

  if (modUi.filter) return;

  if (modUi.blur) {
    return (
      <div className={className}>
        <div className="relative overflow-hidden rounded-2xl">
          <div className="blur-3xl">{children}</div>
          <div className="absolute inset-0 flex items-center justify-center"></div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <h4 className="font-medium text-orange-100">Content Warning</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
