import { AppLayout } from "@/components/layout/app-layout";
import { useGetNotifications } from "@workspace/api-client-react";
import { apiPost } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ArrowRightLeft, PiggyBank, Landmark, ShieldCheck, Gift, BellRing, Info, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Notification = { id: number; title?: string; message: string; type?: string; isRead: boolean; createdAt: string };

function TypeIcon({ type }: { type?: string }) {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    trade: { icon: ArrowRightLeft, color: "text-primary bg-primary/10" },
    savings: { icon: PiggyBank, color: "text-blue-500 bg-blue-500/10" },
    withdrawal: { icon: Landmark, color: "text-orange-500 bg-orange-500/10" },
    kyc: { icon: ShieldCheck, color: "text-purple-500 bg-purple-500/10" },
    referral: { icon: Gift, color: "text-pink-500 bg-pink-500/10" },
    rate_alert: { icon: BellRing, color: "text-yellow-500 bg-yellow-500/10" },
    chat: { icon: MessageSquare, color: "text-teal-500 bg-teal-500/10" },
    system: { icon: Info, color: "text-muted-foreground bg-secondary" },
  };
  const entry = type ? map[type] : null;
  const { icon: Icon, color } = entry || { icon: Info, color: "text-muted-foreground bg-secondary" };
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color.split(" ")[1])}>
      <Icon className={cn("h-4 w-4", color.split(" ")[0])} />
    </div>
  );
}

export default function Notifications() {
  const { data: rawNotifs = [], isLoading, refetch } = useGetNotifications();
  const qc = useQueryClient();

  const notifications = rawNotifs as unknown as Notification[];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAll = async () => {
    await apiPost("/user/notifications/read-all");
    qc.invalidateQueries({ queryKey: ["notifications"] });
    refetch();
  };

  const handleMarkOne = async (id: number) => {
    await apiPost(`/user/notifications/${id}/read`);
    refetch();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && <Badge className="bg-primary text-primary-foreground">{unreadCount} new</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAll}>
              <CheckCheck className="h-4 w-4" />Mark all read
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">You're all caught up.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkOne(n.id)}
                  className={cn(
                    "flex items-start gap-4 p-4 border-b last:border-0 transition-colors",
                    !n.isRead ? "bg-primary/5 cursor-pointer hover:bg-primary/10" : "hover:bg-secondary/30"
                  )}
                >
                  <TypeIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    {n.title && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{n.title}</span>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.createdAt), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
