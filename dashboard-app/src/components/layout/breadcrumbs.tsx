"use client";

/**
 * Breadcrumbs navigation component.
 * Shows navigation hierarchy based on current route.
 * Overview is always the base item in breadcrumbs.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { useBreadcrumbsOptional } from "./breadcrumbs-context";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsMetadata {
  userName?: string;
  fromUserId?: string;
  fromUserName?: string;
}

function getBreadcrumbs(pathname: string, metadata?: BreadcrumbsMetadata | null): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const base: BreadcrumbItem = { label: "Overview", href: "/dashboard" };

  // Overview page - just show Overview without link
  if (pathname === "/dashboard" || pathname === "/") {
    return [{ label: "Overview" }];
  }

  if (pathname === "/sessions") {
    return [base, { label: "Sessions" }];
  }

  if (pathname.startsWith("/sessions/")) {
    const sessionId = segments[1];
    const truncatedId = `#${sessionId.slice(0, 8)}`;

    // If we came from a user page, show that context
    if (metadata?.fromUserId && metadata?.fromUserName) {
      return [
        base,
        { label: "Users", href: "/users" },
        { label: metadata.fromUserName, href: `/users/${metadata.fromUserId}` },
        { label: truncatedId },
      ];
    }

    return [base, { label: "Sessions", href: "/sessions" }, { label: truncatedId }];
  }

  if (pathname === "/users") {
    return [base, { label: "Users" }];
  }

  if (pathname.startsWith("/users/")) {
    const userName = metadata?.userName || segments[1];
    return [base, { label: "Users", href: "/users" }, { label: userName }];
  }

  if (pathname === "/global") {
    return [base, { label: "Global Overview" }];
  }

  // Fallback: capitalize path segments
  const items: BreadcrumbItem[] = [base];
  segments.forEach((segment, index) => {
    items.push({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: index < segments.length - 1 ? `/${segments.slice(0, index + 1).join("/")}` : undefined,
    });
  });
  return items;
}

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname();
  const context = useBreadcrumbsOptional();
  const items = getBreadcrumbs(pathname, context?.metadata);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)}>
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={item.href ?? item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {item.href ? (
              <Link href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
