import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, useGetNotifications } from "@workspace/api-client-react";
import { ModeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard, ArrowRightLeft, PiggyBank, Landmark, History,
  UserCircle, Bell, ShieldAlert, LogOut, Menu, X, Users, BadgeCheck,
  GitFork, BellRing, Shield, MessageSquare, Star, Settings
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const logoutMutation = useLogout();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: notifications } = useGetNotifications({ query: { refetchInterval: 30000 } });
  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead).length ?? 0;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => { logout(); setLocation("/"); }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/p2p", label: "P2P Trade", icon: Users },
    { href: "/exchange", label: "Quick Exchange", icon: ArrowRightLeft },
    { href: "/savings", label: "Savings", icon: PiggyBank },
    { href: "/withdraw", label: "Withdraw", icon: Landmark },
    { href: "/history", label: "History", icon: History },
  ];

  const accountItems = [
    { href: "/kyc", label: "KYC Verification", icon: BadgeCheck },
    { href: "/referrals", label: "Referral Program", icon: GitFork },
    { href: "/rate-alerts", label: "Rate Alerts", icon: BellRing },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ];

  const adminItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/exchange", label: "Orders", icon: ArrowRightLeft },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: Landmark },
    { href: "/admin/kyc", label: "KYC Queue", icon: Shield },
    { href: "/admin/buyers", label: "P2P Buyers", icon: Users },
    { href: "/admin/chat", label: "Chat", icon: MessageSquare },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/admin/audit", label: "Audit Log", icon: History },
  ];

  const kycBadge = user?.kycStatus === "approved" ? null : user?.kycStatus === "pending" ? "pending" : "needed";
  const avatarLetter = (user?.username || user?.email || "?")[0].toUpperCase();

  const NavLink = ({ item }: { item: typeof navItems[0] & { badge?: number } }) => (
    <Link key={item.href} href={item.href} className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      location === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && location.startsWith(item.href))
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )} onClick={() => setSidebarOpen(false)}>
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge ? <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground">{item.badge}</Badge> : null}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <Link href="/dashboard" className="font-bold text-xl text-primary">Cryptex</Link>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-2xl text-primary tracking-tight">Cryptex</Link>
          <ModeToggle />
        </div>

        <div className="px-4 py-2 mt-4 md:mt-0 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Trading</div>
          {navItems.map(item => <NavLink key={item.href} item={item} />)}

          <div className="mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Account</div>
          {accountItems.map(item => (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )} onClick={() => setSidebarOpen(false)}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/kyc" && kycBadge && (
                <Badge variant={kycBadge === "pending" ? "secondary" : "destructive"} className="text-xs h-5 px-1.5">
                  {kycBadge === "pending" ? "⏳" : "!"}
                </Badge>
              )}
              {item.badge ? <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground">{item.badge}</Badge> : null}
            </Link>
          ))}

          {user?.isAdmin && (
            <>
              <div className="mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Admin
              </div>
              {adminItems.map(item => <NavLink key={item.href} item={item} />)}
            </>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {avatarLetter}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.username || user?.email?.split("@")[0]}</span>
              <span className="text-xs text-muted-foreground">{user?.kycStatus === "approved" ? "✓ Verified" : "Unverified"}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
