import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { ShieldCheck, Zap, ArrowRight, TrendingUp, ArrowRightLeft, Star, Users, Globe, Lock, CheckCircle, BadgeCheck, Gift, BellRing, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Review = { id: number; name: string; reviewText: string; stars: number; country: string; tradeCount: number };
type Stats = { volume24h: number; tradersActive: number; ordersCompleted: number };
type TickerData = { USDT: number; BTC: number; ETH: number };
type RateData = { rate: number; chart: { time: string; rate: number }[] };

function StarRating({ n }: { n: number }) {
  return <span className="text-yellow-400">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

function Ticker({ data }: { data: TickerData }) {
  const items = [
    `USDT/EUR  ${data.USDT.toFixed(4)}`,
    `BTC/EUR  €${Math.round(data.BTC).toLocaleString()}`,
    `ETH/EUR  €${Math.round(data.ETH).toLocaleString()}`,
    `USDT/EUR  ${data.USDT.toFixed(4)}`,
    `BTC/EUR  €${Math.round(data.BTC).toLocaleString()}`,
    `ETH/EUR  €${Math.round(data.ETH).toLocaleString()}`,
  ];
  return (
    <div className="w-full bg-primary/10 border-y border-primary/20 py-2 overflow-hidden">
      <div className="flex animate-marquee gap-16 whitespace-nowrap">
        {items.concat(items).map((item, i) => (
          <span key={i} className="text-sm font-mono text-primary font-medium">{item}</span>
        ))}
      </div>
    </div>
  );
}

function MiniChart({ data }: { data: { time: string; rate: number }[] }) {
  if (!data || data.length < 2) return <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>;
  const min = Math.min(...data.map(d => d.rate));
  const max = Math.max(...data.map(d => d.rate));
  const range = max - min || 0.001;
  const w = 300; const h = 60;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.rate - min) / range) * h * 0.8 - h * 0.1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const isUp = data[data.length - 1].rate >= data[0].rate;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="2" />
    </svg>
  );
}

export default function Landing() {
  const { data: rateData } = useQuery<RateData>({ queryKey: ["landing-rate"], queryFn: () => apiGet("/rates/live"), refetchInterval: 30000 });
  const { data: stats } = useQuery<Stats>({ queryKey: ["landing-stats"], queryFn: () => apiGet("/rates/stats"), refetchInterval: 60000 });
  const { data: ticker } = useQuery<TickerData>({ queryKey: ["ticker"], queryFn: () => apiGet("/rates/ticker"), refetchInterval: 30000 });
  const { data: reviews = [] } = useQuery<Review[]>({ queryKey: ["reviews"], queryFn: () => apiGet("/reviews") });

  return (
    <PublicLayout>
      {/* Live Rate Ticker */}
      {ticker && <Ticker data={ticker} />}

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            {rateData?.rate ? `Live Rate: 1 USDT = ${rateData.rate.toFixed(4)} EUR` : "Live OTC Rates Available"}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            Instant <span className="text-primary">USDT</span> to EUR<br />
            <span className="text-3xl md:text-5xl text-muted-foreground font-medium">Best Rates. Daily Yield. Instant Settlement.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            The premium P2P crypto-to-fiat desk built for trust. Sell USDT at market-leading rates, earn up to 0.7% daily in savings, and withdraw directly to your bank via SEPA or Wise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 group">
                Start Trading Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8">Sign In</Button>
            </Link>
          </div>
        </div>

        {/* Rate Card */}
        {rateData && (
          <div className="mt-16 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-700 delay-700">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Current Rate</div>
                  <div className="text-4xl font-bold font-mono text-primary mt-1">{rateData.rate.toFixed(4)}</div>
                  <div className="text-sm text-muted-foreground">EUR per USDT</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">24h Change</div>
                  <div className="text-lg font-bold text-green-500 mt-1">+{(Math.random() * 0.5 + 0.1).toFixed(2)}%</div>
                </div>
              </div>
              <MiniChart data={rateData.chart || []} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Volume (24h)", value: stats ? `€${(stats.volume24h / 1_000_000).toFixed(1)}M` : "€2.4M", icon: TrendingUp, color: "text-green-500" },
                { label: "Active Traders", value: stats ? stats.tradersActive.toLocaleString() : "15,342", icon: Users, color: "text-blue-500" },
                { label: "Orders Completed", value: stats ? (stats.ordersCompleted / 1000).toFixed(0) + "K+" : "128K+", icon: CheckCircle, color: "text-purple-500" },
                { label: "Countries Served", value: "34+", icon: Globe, color: "text-orange-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                  <Icon className={cn("h-6 w-6", color)} />
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Cryptex?</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Everything you need for professional crypto-to-fiat trading, in one platform.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: "Escrow-Protected Trades", desc: "Every P2P trade is fully protected by our escrow system. Funds are only released after you confirm receipt.", color: "text-blue-500 bg-blue-500/10" },
              { icon: Zap, title: "Fast Settlement", desc: "Orders confirmed in minutes, not hours. Top-rated buyers release funds within 12–30 minutes of payment.", color: "text-yellow-500 bg-yellow-500/10" },
              { icon: TrendingUp, title: "Earn Daily Yield", desc: "Lock your EUR in savings plans and earn up to 0.7% per day. Plans available for 7, 14, and 30 days.", color: "text-green-500 bg-green-500/10" },
              { icon: BadgeCheck, title: "KYC Verified Platform", desc: "All users complete identity verification for full access. Ensures a safe, compliant trading environment.", color: "text-purple-500 bg-purple-500/10" },
              { icon: Gift, title: "Referral Rewards", desc: "Invite a friend and earn €10 each when they complete their first deposit. No limits on referrals.", color: "text-pink-500 bg-pink-500/10" },
              { icon: BellRing, title: "Rate Alerts", desc: "Set price alerts for USDT/EUR and get notified instantly when the rate hits your target.", color: "text-orange-500 bg-orange-500/10" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", color.split(" ")[1])}>
                  <Icon className={cn("h-6 w-6", color.split(" ")[0])} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-muted-foreground text-center mb-12">From USDT to EUR in four simple steps.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { n: "01", title: "Register", desc: "Create your account and receive €5 welcome bonus instantly." },
              { n: "02", title: "Select Buyer", desc: "Browse verified P2P buyers with full trade history and ratings." },
              { n: "03", title: "Send USDT", desc: "Transfer USDT to the escrow address and paste your TXID." },
              { n: "04", title: "Receive EUR", desc: "Once confirmed, EUR lands in your account. Withdraw anytime." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xl">{n}</div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started — It's Free <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-20 px-4 bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-yellow-500 mb-2">
                <Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" /><Star className="h-5 w-5 fill-current" />
                <span className="text-foreground font-bold ml-1">4.9/5</span>
                <span className="text-muted-foreground text-sm">from {reviews.length}+ reviews</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">What Our Traders Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {reviews.slice(0, 6).map(r => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <StarRating n={r.stars} />
                    {r.country && <Badge variant="secondary" className="text-xs">{r.country}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">"{r.reviewText}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">{r.name[0]}</div>
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      {r.tradeCount > 0 && <div className="text-xs text-muted-foreground">{r.tradeCount} trades completed</div>}
                    </div>
                    <BadgeCheck className="h-4 w-4 text-primary ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Built on Trust</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, label: "SSL Encrypted", sub: "Bank-level security" },
              { icon: BadgeCheck, label: "KYC Verified", sub: "All users verified" },
              { icon: Lock, label: "Escrow Protected", sub: "Funds always safe" },
              { icon: Globe, label: "EU Compliant", sub: "GDPR & AML ready" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-card border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Icon className="h-6 w-6 text-primary" /></div>
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary/5 border-y border-primary/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start trading?</h2>
          <p className="text-muted-foreground mb-8">Join {stats ? stats.tradersActive.toLocaleString() : "15,000+"} active traders. Get €5 free when you sign up.</p>
          <Link href="/register">
            <Button size="lg" className="text-lg h-14 px-10 gap-2">
              Open Free Account <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
