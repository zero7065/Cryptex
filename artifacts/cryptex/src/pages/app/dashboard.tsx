import { AppLayout } from "@/components/layout/app-layout";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Lock, ArrowRightLeft, PiggyBank, Landmark, TrendingUp, History, BadgeCheck, Gift, Bell, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type RateData = { rate: number };
type ActivityItem = { id: number; type: string; description: string; amount: number; status: string; txHash: string | null; createdAt: string };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-500/20 text-green-500",
    approved: "bg-green-500/20 text-green-500",
    pending: "bg-yellow-500/20 text-yellow-500",
    active: "bg-blue-500/20 text-blue-500",
    rejected: "bg-red-500/20 text-red-500",
  };
  return <Badge className={cn("text-xs", map[status] || "bg-secondary text-muted-foreground")}>{status}</Badge>;
}

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { user } = useAuth();
  const { data: rateData } = useQuery<RateData>({ queryKey: ["live-rate"], queryFn: () => apiGet("/rates/live"), refetchInterval: 30000 });

  const kycStatus = (dashboard as any)?.kycStatus || user?.kycStatus || "none";
  const username = (dashboard as any)?.username || user?.username || user?.email?.split("@")[0];
  const usdtDeposited = (dashboard as any)?.usdtDeposited || 0;
  const totalProfitEarned = (dashboard as any)?.totalProfitEarned || 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton className="h-80 rounded-xl" /></div>
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {username}!</h1>
            <p className="text-sm text-muted-foreground">Your portfolio at a glance.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/p2p"><Button className="font-medium gap-2"><Users className="h-4 w-4" />P2P Trade</Button></Link>
            <Link href="/withdraw"><Button variant="outline" className="gap-2"><Landmark className="h-4 w-4" />Withdraw</Button></Link>
          </div>
        </div>

        {/* KYC Banner */}
        {kycStatus !== "approved" && (
          <div className={cn("flex items-center gap-4 p-4 rounded-xl border", kycStatus === "pending" ? "bg-yellow-500/5 border-yellow-500/20" : "bg-primary/5 border-primary/20")}>
            {kycStatus === "pending" ? <Clock className="h-6 w-6 text-yellow-500 shrink-0" /> : <AlertTriangle className="h-6 w-6 text-primary shrink-0" />}
            <div className="flex-1">
              <div className="font-medium">{kycStatus === "pending" ? "KYC Under Review" : "Verify Your Identity"}</div>
              <div className="text-sm text-muted-foreground">{kycStatus === "pending" ? "Your documents are being reviewed (1-2 business days)." : "Complete KYC to unlock withdrawals and higher trading limits."}</div>
            </div>
            {kycStatus !== "pending" && <Link href="/kyc"><Button size="sm" variant="outline" className="shrink-0">Verify Now</Button></Link>}
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total EUR</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">€{((dashboard?.totalEur) ?? 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">Available + Locked</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">€{(dashboard?.availableEur ?? 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">Ready to withdraw</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Savings</CardTitle>
              <Lock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">€{(dashboard?.lockedEur ?? 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1 text-green-500">+€{totalProfitEarned.toFixed(2)} earned</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">USDT Traded</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{usdtDeposited.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {rateData?.rate ? `≈ €${(usdtDeposited * rateData.rate).toFixed(0)}` : "USDT all time"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <Link href="/history"><Button variant="ghost" size="sm">View All <History className="h-4 w-4 ml-1" /></Button></Link>
              </CardHeader>
              <CardContent>
                {(!dashboard || (dashboard as any).recentActivity?.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No transactions yet. <Link href="/p2p" className="text-primary underline">Start trading!</Link></p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {((dashboard as any).recentActivity || []).map((item: ActivityItem) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 py-2 border-b last:border-0">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          item.type === "exchange" ? "bg-primary/10" : item.type === "savings" ? "bg-blue-500/10" : "bg-orange-500/10")}>
                          {item.type === "exchange" ? <ArrowRightLeft className="h-4 w-4 text-primary" /> :
                           item.type === "savings" ? <PiggyBank className="h-4 w-4 text-blue-500" /> :
                           <Landmark className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.description}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold font-mono">€{item.amount.toFixed(2)}</div>
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { href: "/p2p", icon: Users, label: "P2P Trade", color: "text-primary bg-primary/10" },
                  { href: "/exchange", icon: ArrowRightLeft, label: "Quick Exchange", color: "text-blue-500 bg-blue-500/10" },
                  { href: "/savings", icon: PiggyBank, label: "Savings", color: "text-green-500 bg-green-500/10" },
                  { href: "/withdraw", icon: Landmark, label: "Withdraw", color: "text-orange-500 bg-orange-500/10" },
                  { href: "/referrals", icon: Gift, label: "Referrals", color: "text-pink-500 bg-pink-500/10" },
                  { href: "/rate-alerts", icon: Bell, label: "Rate Alerts", color: "text-yellow-500 bg-yellow-500/10" },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link key={href} href={href}>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary/70 transition-colors cursor-pointer text-center">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color.split(" ")[1])}>
                        <Icon className={cn("h-5 w-5", color.split(" ")[0])} />
                      </div>
                      <span className="text-xs font-medium leading-tight">{label}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {kycStatus === "approved" && (
              <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
                <div><div className="text-sm font-medium text-green-500">Identity Verified</div><div className="text-xs text-muted-foreground">Full account access</div></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
