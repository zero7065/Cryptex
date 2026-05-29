import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Copy, Users, CheckCircle, Clock, Link as LinkIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ReferralData = {
  referralCode: string;
  totalReferrals: number;
  completedReferrals: number;
  totalBonusEarned: number;
  referralBonusAmount: number;
  welcomeBonusAmount: number;
  referrals: { id: number; referredEmail: string; status: string; bonusEarned: boolean; depositMet: boolean; createdAt: string }[];
};

export default function ReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["referrals"],
    queryFn: () => apiGet("/referrals"),
  });

  const referralCode = data?.referralCode || user?.referralCode || "—";
  const baseUrl = window.location.origin + import.meta.env.BASE_URL;
  const referralLink = `${baseUrl}register?ref=${referralCode}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground mt-1">Invite friends and earn bonuses when they make their first deposit.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : (
          <>
            {/* How it works */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: LinkIcon, label: "Share Link", desc: "Send your referral link" },
                { icon: Users, label: "Friend Signs Up", desc: "They register & deposit" },
                { icon: Gift, label: "Both Earn", desc: `€${data?.referralBonusAmount || 10} each!` },
              ].map(({ icon: Icon, label, desc }, i) => (
                <div key={i} className="flex flex-col items-center text-center p-4 bg-card rounded-xl border gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{data?.totalReferrals ?? 0}</div><div className="text-xs text-muted-foreground mt-1">Total Referrals</div></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-500">{data?.completedReferrals ?? 0}</div><div className="text-xs text-muted-foreground mt-1">Completed</div></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">€{(data?.totalBonusEarned ?? 0).toFixed(2)}</div><div className="text-xs text-muted-foreground mt-1">Total Earned</div></CardContent></Card>
            </div>

            {/* Code and Link */}
            <Card>
              <CardHeader><CardTitle>Your Referral Code</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 text-center py-4 bg-secondary/50 rounded-xl font-mono text-3xl font-bold tracking-widest text-primary border border-primary/20">
                    {referralCode}
                  </div>
                  <Button variant="outline" size="icon" className="h-16 w-16" onClick={() => copy(referralCode, "Referral code")}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Referral Link</div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm font-mono truncate">{referralLink}</div>
                    <Button variant="outline" size="sm" onClick={() => copy(referralLink, "Referral link")}>Copy Link</Button>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                  <div className="font-medium mb-1">How it works:</div>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Your friend signs up using your code or link</li>
                    <li>• They get a €{data?.welcomeBonusAmount || 5} welcome bonus</li>
                    <li>• When they deposit ≥100 USDT, you both earn €{data?.referralBonusAmount || 10}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Referral list */}
            {(data?.referrals?.length ?? 0) > 0 && (
              <Card>
                <CardHeader><CardTitle>Your Referrals</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data!.referrals.map(r => (
                      <div key={r.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                          {r.referredEmail[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{r.referredEmail}</div>
                          <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                        <Badge className={cn(
                          r.bonusEarned ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-secondary text-muted-foreground"
                        )}>
                          {r.bonusEarned ? <><CheckCircle className="h-3 w-3 mr-1" />Bonus Earned</> : <><Clock className="h-3 w-3 mr-1" />Pending Deposit</>}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
