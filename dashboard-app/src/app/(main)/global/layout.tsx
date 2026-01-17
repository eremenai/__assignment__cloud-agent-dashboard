import type { ReactNode } from "react";

interface GlobalLayoutProps {
	children: ReactNode;
}

export default function GlobalLayout({ children }: GlobalLayoutProps) {
	return <>{children}</>;
}
