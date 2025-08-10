"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { useModerationStore } from "@/lib/stores/moderation";

export function ModerationSettings() {
  const { showContentWarnings, setShowContentWarnings } = useModerationStore();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Content Settings
        </h1>
        <p className="text-muted-foreground">
          Simple content warning settings. All other moderation is handled by
          your Bluesky account settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Warnings</CardTitle>
          <CardDescription>
            Control whether to show warnings for potentially sensitive content
            based on community labels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Show Content Warnings</Label>
              <p className="text-sm text-muted-foreground">
                Display warnings for content that has been labeled by the
                community
              </p>
            </div>
            <Switch
              checked={showContentWarnings}
              onCheckedChange={setShowContentWarnings}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Moderation</CardTitle>
          <CardDescription>
            For blocking users, muting words, or other moderation features,
            please use the official Bluesky app.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            This app syncs with your Bluesky moderation preferences
            automatically. Changes made in the official Bluesky app will be
            reflected here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
