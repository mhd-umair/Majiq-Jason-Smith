import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DrillLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline",
        className,
      )}
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
    </Link>
  );
}
