import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, badge, action, children }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}