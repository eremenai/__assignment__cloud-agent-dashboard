import type { ReactNode } from "react";

interface SessionsLayoutProps {
  children: ReactNode;
}

export default function SessionsLayout({ children }: SessionsLayoutProps) {
  return <>{children}</>;
}
