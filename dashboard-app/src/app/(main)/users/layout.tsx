import type { ReactNode } from "react";

interface UsersLayoutProps {
	children: ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
	return <>{children}</>;
}
