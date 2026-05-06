import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: ChartCardProps) {
  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action ? <div className="ml-2 flex-shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("min-w-0 flex-1 pt-2", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
