import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Euro, PiggyBank, ArrowRightLeft, Landmark, Activity, CheckCircle2, Shield, MessageSquare, Star, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type Stats = {
  totalUsers: number; totalAvailableEur: number; totalLockedEur: number;
  pendingExchangeOrders: number; pendingWithdrawals: number; activeSavingsPlans: number;
  pendingKycCount: number; totalVolume24h: number; completedOrdersToday: number;
};

function StatCard({ label, value, icon: Icon, color, href }: { label: string; value: string | number; icon: React.ElementType; color?: string; href?: string }) {
  const content = (
    <Card className={cn("border-border shadow-sm hover:border-primary/40 transition-colors", href && "cursor-pointer")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
        <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold font-mono", color)}>{value}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({ queryKey: ["admin-stats"], queryFn: () => apiGet("/admin/stats"), refetchInterval: 30000 });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  const pendingItems = [
    { label: "Exchange Orders", count: stats?.pendingExchangeOrders ?? 0, href: "/admin/exchange", icon: ArrowRightLeft, color: "text-primary" },
    { label: "Withdrawals", count: stats?.pendingWithdrawals ?? 0, href: "/admin/withdrawals", icon: Landmark, color: "text-orange-500" },
    { label: "KYC Submissions", count: stats?.pendingKycCount ?? 0, href: "/admin/kyc", icon: Shield, color: "text-purple-500" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time platform overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
          <StatCard label="Available EUR" value={`€${(stats?.totalAvailableEur ?? 0).toFixed(2)}`} icon={Euro} color="text-green-500" />
          <StatCard label="Locked EUR" value={`€${(stats?.totalLockedEur ?? 0).toFixed(2)}`} icon={PiggyBank} />
          <StatCard label="24h Volume" value={`€${(stats?.totalVolume24h ?? 0).toFixed(2)}`} icon={TrendingUp} color="text-primary" />
          <StatCard label="Active Savings" value={stats?.activeSavingsPlans ?? 0} icon={PiggyBank} color="text-blue-500" />
          <StatCard label="Orders Today" value={stats?.completedOrdersToday ?? 0} icon={CheckCircle2} color="text-green-500" />
          <StatCard label="Pending Orders" value={stats?.pendingExchangeOrders ?? 0} icon={ArrowRightLeft} color="text-yellow-500" href="/admin/exchange" />
          <StatCard label="Pending KYC" value={stats?.pendingKycCount ?? 0} icon={Shield} color="text-purple-500" href="/admin/kyc" />
        </div>

        {/* Pending Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingItems.map(({ label, count, href, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <Card className={cn("hover:border-primary/50 transition-colors cursor-pointer", count > 0 ? "border-primary/30 bg-primary/5" : "")}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{label}</div>
                      <div className={cn("text-4xl font-bold font-mono mt-1", count > 0 ? color : "text-muted-foreground")}>{count}</div>
                    </div>
                    <Icon className={cn("h-10 w-10 opacity-20", color)} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { href: "/admin/users", icon: Users, label: "Users" },
              { href: "/admin/exchange", icon: ArrowRightLeft, label: "Orders" },
              { href: "/admin/withdrawals", icon: Landmark, label: "Withdrawals" },
              { href: "/admin/kyc", icon: Shield, label: "KYC" },
              { href: "/admin/buyers", icon: Users, label: "Buyers" },
              { href: "/admin/chat", icon: MessageSquare, label: "Chat" },
              { href: "/admin/reviews", icon: Star, label: "Reviews" },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-secondary/50 transition-colors cursor-pointer text-center">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
