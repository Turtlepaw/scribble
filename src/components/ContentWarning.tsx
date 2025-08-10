"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { type ModerationOpts } from "@atproto/api/dist/moderation/types";
import { useModerationStore } from "@/lib/stores/moderation";
import { useAuth } from "@/lib/hooks/useAuth";

interface ContentWarningProps {
  post: PostView;
  children: React.ReactNode;
  className?: string;
}

export function ContentWarning({
  post,
  children,
  className,
}: ContentWarningProps) {
  const { session, agent } = useAuth();
  const { shouldShowWarning, getModerationDecision } = useModerationStore();
  const [showContent, setShowContent] = useState(false);
  const [moderationOpts, setModerationOpts] = useState<ModerationOpts | null>(
    null
  );

  // Load user's actual moderation preferences from Bluesky
  useEffect(() => {
    async function loadModerationPrefs() {
      if (!agent || !session?.did) return;

      try {
        const prefs = await agent.getPreferences();
        const moderationPrefs = prefs.moderationPrefs;

        setModerationOpts({
          userDid: session.did,
          prefs: {
            adultContentEnabled: moderationPrefs.adultContentEnabled,
            labels: moderationPrefs.labels,
            labelers: moderationPrefs.labelers,
            mutedWords: moderationPrefs.mutedWords,
            hiddenPosts: moderationPrefs.hiddenPosts,
          },
        });
      } catch (error) {
        console.warn("Failed to load moderation preferences:", error);
        // Fallback to basic preferences
        setModerationOpts({
          userDid: session.did,
          prefs: {
            adultContentEnabled: false,
            labels: {},
            labelers: [],
            mutedWords: [],
            hiddenPosts: [],
          },
        });
      }
    }

    loadModerationPrefs();
  }, [agent, session?.did]);

  // Don't render anything until we have moderation options
  if (!moderationOpts) {
    return <div className={className}>{children}</div>;
  }

  const shouldWarn = shouldShowWarning(post, moderationOpts);

  // If no warning needed, show content normally
  if (!shouldWarn || showContent) {
    return <div className={className}>{children}</div>;
  }

  // Get the specific moderation decision to show relevant warning
  const decision = getModerationDecision(post, moderationOpts);
  const ui = decision.ui("contentView");
  const causes = [...ui.alerts, ...ui.informs];

  return (
    <Card
      className={`p-4 border-orange-200 dark:border-orange-800 ${className}`}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <h4 className="font-medium text-orange-900 dark:text-orange-100">
              Content Warning
            </h4>
            <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
              {causes.map((cause, index) => (
                <div key={index}>
                  {cause.type === "label" && (
                    <span>
                      This content has been labeled: {cause.label.val}
                      {cause.labelDef.adultOnly && " (adult content)"}
                    </span>
                  )}
                  {cause.type === "mute-word" && (
                    <span>Contains muted words</span>
                  )}
                </div>
              ))}
              {causes.length === 0 && (
                <span>This content may be sensitive</span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowContent(true)}
          className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950"
        >
          <Eye className="h-4 w-4 mr-1" />
          Show Content
        </Button>
      </div>
    </Card>
  );
}
