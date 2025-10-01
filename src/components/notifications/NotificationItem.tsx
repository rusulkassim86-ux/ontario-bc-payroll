import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { FileCheck, Bell, AlertCircle } from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "supervisor_approval":
        return <FileCheck className="h-5 w-5 text-blue-500" />;
      case "final_approval":
        return <FileCheck className="h-5 w-5 text-green-500" />;
      case "rejection":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
        !notification.read_at && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm font-medium",
              !notification.read_at && "font-semibold"
            )}>
              {notification.title}
            </p>
            {!notification.read_at && (
              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {notification.body}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>
    </div>
  );
};