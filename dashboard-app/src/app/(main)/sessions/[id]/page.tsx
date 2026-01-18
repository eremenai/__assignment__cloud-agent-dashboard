"use client";

/**
 * Session Detail Page - Deep-dive view into a single session.
 */

import { use, useCallback, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/analytics";
import { useBreadcrumbs } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionDetail } from "@/dev/mock-api";
import { useAuth } from "@/lib/auth";
import type { SessionDetailResponse } from "@/lib/types/api";

import { ArtifactsTab } from "./_components/artifacts-tab";
import { RunsTab } from "./_components/runs-tab";
import { SessionHeader } from "./_components/session-header";
import { SessionTimelineBar } from "./_components/session-timeline-bar";
import { TimelineTab } from "./_components/timeline-tab";

interface SessionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const resolvedParams = use(params);
  const { user, can } = useAuth();
  const searchParams = useSearchParams();
  const { setMetadata, clearMetadata } = useBreadcrumbs();

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [highlightedRunId, setHighlightedRunId] = useState<string | null>(null);

  // Handle run click from the Runs tab - switch to timeline and highlight
  const handleRunClick = useCallback((runId: string) => {
    setActiveTab("timeline");
    setHighlightedRunId(runId);
  }, []);

  // Clear highlight after animation completes
  const handleHighlightComplete = useCallback(() => {
    setHighlightedRunId(null);
  }, []);

  // Set breadcrumb context from URL params (when navigating from user detail)
  useEffect(() => {
    const fromUser = searchParams.get("fromUser");
    const fromUserName = searchParams.get("fromUserName");

    if (fromUser && fromUserName) {
      setMetadata({
        fromUserId: fromUser,
        fromUserName: fromUserName,
      });
    }

    return () => clearMetadata();
  }, [searchParams, setMetadata, clearMetadata]);

  useEffect(() => {
    setIsLoading(true);

    const timer = setTimeout(() => {
      const data = getSessionDetail(resolvedParams.id);
      setSession(data);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [resolvedParams.id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  // Session not found
  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Session not found"
          description="The session you're looking for doesn't exist or you don't have access to it."
          actionLabel="Back to Sessions"
          onAction={() => {
            window.location.href = "/sessions";
          }}
        />
      </div>
    );
  }

  // Permission check - MEMBER can only view own sessions
  const canViewAllSessions = can("view_org_sessions");
  if (!canViewAllSessions && user && session.session.createdByUserId !== user.userId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="You don't have permission to view this session."
          actionLabel="Back to Sessions"
          onAction={() => {
            window.location.href = "/sessions";
          }}
        />
      </div>
    );
  }

  return (
    <div className="@container/main space-y-6">
      {/* Session Header */}
      <SessionHeader session={session.session} />

      {/* Visual Timeline Bar */}
      <SessionTimelineBar
        sessionStart={session.session.firstMessageAt}
        sessionEnd={session.session.lastMessageAt}
        runs={session.runs}
        handoffs={session.handoffs}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="runs">Runs ({session.runs.length})</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <TimelineTab
            events={session.events}
            runs={session.runs}
            handoffs={session.handoffs}
            highlightedRunId={highlightedRunId}
            onHighlightComplete={handleHighlightComplete}
          />
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <RunsTab runs={session.runs} onRunClick={handleRunClick} />
        </TabsContent>

        <TabsContent value="artifacts" className="mt-4">
          <ArtifactsTab artifacts={session.artifacts} handoffs={session.handoffs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
