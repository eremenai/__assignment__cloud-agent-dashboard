/**
 * Role badge component for user role display.
 */

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/domain";
import { getRoleLabel } from "@/lib/types/auth";

const roleBadgeVariants = cva(
	"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
	{
		variants: {
			role: {
				MEMBER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
				MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
				ORG_ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
				SUPPORT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
				SUPER_ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
			},
		},
		defaultVariants: {
			role: "MEMBER",
		},
	},
);

interface RoleBadgeProps extends VariantProps<typeof roleBadgeVariants> {
	/** The user role */
	role: UserRole;
	/** Optional custom label (defaults to role label from auth types) */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

export function RoleBadge({ role, label, className }: RoleBadgeProps) {
	return (
		<span className={cn(roleBadgeVariants({ role }), className)}>
			{label ?? getRoleLabel(role)}
		</span>
	);
}
