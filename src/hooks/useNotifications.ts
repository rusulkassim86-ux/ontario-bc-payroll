import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: any;
  read_at: string | null;
  created_at: string;
  action_url: string | null;
}

export const useNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_notification_count");
      if (error) throw error;
      return data as number;
    },
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("New notification:", payload);
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
            
            // Show toast for new notification
            if (payload.new) {
              toast({
                title: (payload.new as any).title,
                description: (payload.new as any).body,
              });
            }
          }
        )
        .subscribe();

      return channel;
    };

    let channelPromise = setupSubscription();

    return () => {
      channelPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [queryClient, toast]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc("mark_notification_read", {
        p_notification_id: notificationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n) => !n.read_at);
      await Promise.all(
        unreadNotifications.map((n) =>
          supabase.rpc("mark_notification_read", {
            p_notification_id: n.id,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
};