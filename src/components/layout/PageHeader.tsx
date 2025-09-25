import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, badge, action, children }: PageHeaderProps) {
  // Check if we're in preview mode (localhost or lovableproject.com)
  const isPreviewMode = window.location.hostname.includes('localhost') || 
                       window.location.hostname.includes('lovableproject.com');

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
          <div className="flex items-center gap-2">
            {action && <div>{action}</div>}
            {isPreviewMode && (
              <Link to="/dev/routes">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Debug: View Routes"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}