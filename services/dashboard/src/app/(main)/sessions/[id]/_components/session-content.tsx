"use client";

/**
 * Session detail content with self-contained data fetching.
 */

import { useCallback, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { EmptyState, KPICardSkeleton } from "@/components/analytics";
import { useBreadcrumbs } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { fetchSessionDetail } from "@/lib/data/sessions-data";
import type { SessionDetailResponse } from "@/lib/types/api";

import { ArtifactsTab } from "./artifacts-tab";
import { RunsTab } from "./runs-tab";
import { SessionHeader } from "./session-header";
import { SessionTimelineBar } from "./session-timeline-bar";
import { TimelineTab } from "./timeline-tab";

interface SessionContentProps {
  sessionId: string;
}

export function SessionContent({ sessionId }: SessionContentProps) {
  const { user, can, currentOrgId } = useAuth();
  const searchParams = useSearchParams();
  const { setMetadata, clearMetadata } = useBreadcrumbs();

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [highlightedRunId, setHighlightedRunId] = useState<string | null>(null);

  const orgId = currentOrgId ?? user?.orgId;

  // Handle run click from the Runs tab
  const handleRunClick = useCallback((runId: string) => {
    setActiveTab("timeline");
    setHighlightedRunId(runId);
  }, []);

  // Clear highlight after animation completes
  const handleHighlightComplete = useCallback(() => {
    setHighlightedRunId(null);
  }, []);

  // Set breadcrumb context from URL params
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

  // Fetch session data
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    fetchSessionDetail(orgId, sessionId)
      .then((data) => {
        setSession(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch session:", error);
        setIsLoading(false);
      });
  }, [sessionId, orgId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="@container/main space-y-6">
        {/* Session Header skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
        </div>

        {/* Timeline Bar skeleton */}
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
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

  // Permission check
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
        events={session.events}
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
