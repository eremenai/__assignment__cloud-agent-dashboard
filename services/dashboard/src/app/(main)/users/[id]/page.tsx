"use client";

/**
 * User Detail Page - Deep-dive view into a single user.
 *
 * Data fetching is handled by UserContent component.
 */

import { use } from "react";

import { UserContent } from "./_components/user-content";

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const resolvedParams = use(params);

  return <UserContent userId={resolvedParams.id} />;
}
