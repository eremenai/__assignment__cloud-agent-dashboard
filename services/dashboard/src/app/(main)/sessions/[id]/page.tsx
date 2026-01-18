"use client";

/**
 * Session Detail Page - Deep-dive view into a single session.
 *
 * Data fetching is handled by SessionContent component.
 */

import { use } from "react";

import { SessionContent } from "./_components/session-content";

interface SessionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const resolvedParams = use(params);

  return <SessionContent sessionId={resolvedParams.id} />;
}
