import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Clock, Shield, MessageSquare, CheckCircle, Copy, Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Buyer = { id: number; name: string; tradeCount: number; completionRate: number; avgReleaseTime: string; premiumPercent: number; description: string; avatarUrl: string | null };
type Order = { id: number; status: string; usdtAmount: number; eurAmount: number; txHash: string; buyer: Buyer; escrowStatus: string; createdAt: string };
type ChatMsg = { id: number; senderType: "user" | "admin"; message: string; createdAt: string };

type Step = "buyers" | "amount" | "deposit" | "chat";

export default function P2PPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("buyers");
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [usdtAmount, setUsdtAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ["p2p-buyers"],
    queryFn: () => apiGet("/p2p/buyers"),
  });

  const { data: rateData } = useQuery<{ rate: number }>({
    queryKey: ["live-rate"],
    queryFn: () => apiGet("/rates/live"),
    refetchInterval: 30000,
  });

  const { data: chatMessages = [], refetch: refetchChat } = useQuery<ChatMsg[]>({
    queryKey: ["chat", order?.id],
    queryFn: () => apiGet(`/p2p/orders/${order!.id}/chat`),
    enabled: !!order,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const createOrder = useMutation({
    mutationFn: (data: { usdtAmount: string; txid: string; buyerId: number }) => apiPost<Order>("/p2p/orders", data),
    onSuccess: (newOrder) => { setOrder(newOrder); setStep("chat"); toast({ title: "Order created", description: "Your trade is now active. Chat with your seller." }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: (message: string) => apiPost(`/p2p/orders/${order!.id}/chat`, { message }),
    onSuccess: () => { setChatMessage(""); qc.invalidateQueries({ queryKey: ["chat", order?.id] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const effectiveRate = rateData?.rate ? rateData.rate * (1 + (selectedBuyer?.premiumPercent || 0) / 100) : null;
  const eurPreview = effectiveRate && usdtAmount ? (parseFloat(usdtAmount) * effectiveRate).toFixed(2) : null;

  const WALLET_ADDRESS = "TRx8yVbHgjkvZhKtgfWqVRdm9WkmMnfrGf";
  const copyAddress = () => { navigator.clipboard.writeText(WALLET_ADDRESS); toast({ title: "Copied!", description: "Wallet address copied to clipboard." }); };

  if (step === "buyers") return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">P2P Trading</h1>
          <p className="text-muted-foreground mt-1">Choose a verified buyer and sell your USDT at competitive rates.</p>
        </div>

        {buyersLoading ? (
          <div className="grid grid-cols-1 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {buyers.map(buyer => (
              <Card key={buyer.id} className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group" onClick={() => { setSelectedBuyer(buyer); setStep("amount"); }}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {buyer.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{buyer.name}</h3>
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Verified</Badge>
                        {buyer.completionRate >= 99.5 && <Badge className="bg-primary/20 text-primary border-primary/30">Top Trader</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{buyer.description}</p>
                      <div className="flex flex-wrap gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-foreground">{buyer.tradeCount.toLocaleString()}</span> trades
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-foreground">{buyer.completionRate}%</span> completion
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-foreground">{buyer.avgReleaseTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-muted-foreground">Rate premium</div>
                      <div className="text-2xl font-bold text-primary">+{buyer.premiumPercent}%</div>
                      {rateData?.rate && <div className="text-sm text-muted-foreground font-mono">{(rateData.rate * (1 + buyer.premiumPercent / 100)).toFixed(4)} EUR</div>}
                      <Button size="sm" className="mt-2 group-hover:bg-primary">Select</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );

  if (step === "amount" && selectedBuyer) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
        <Button variant="ghost" onClick={() => setStep("buyers")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to buyers</Button>
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">{selectedBuyer.name[0]}</div>
          <div>
            <div className="font-semibold">{selectedBuyer.name}</div>
            <div className="text-sm text-muted-foreground">{selectedBuyer.completionRate}% • {selectedBuyer.avgReleaseTime}</div>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Enter Trade Amount</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>USDT Amount (50 – 50,000)</Label>
              <Input type="number" min="50" max="50000" placeholder="e.g. 500" value={usdtAmount}
                onChange={e => setUsdtAmount(e.target.value)} className="text-lg font-mono h-12" />
            </div>
            {eurPreview && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You receive</span>
                  <span className="text-2xl font-bold text-primary font-mono">€{eurPreview}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm text-muted-foreground">
                  <span>Rate (incl. premium)</span>
                  <span className="font-mono">{effectiveRate?.toFixed(4)} EUR/USDT</span>
                </div>
              </div>
            )}
            <Button className="w-full h-12" onClick={() => setStep("deposit")} disabled={!usdtAmount || parseFloat(usdtAmount) < 50}>
              Continue to Deposit
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );

  if (step === "deposit" && selectedBuyer) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
        <Button variant="ghost" onClick={() => setStep("amount")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Send USDT to Escrow</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Send exactly</div>
              <div className="text-3xl font-bold font-mono text-primary">{parseFloat(usdtAmount).toFixed(2)} USDT</div>
              <div className="text-sm text-muted-foreground mt-1">Network: TRC20 (TRON)</div>
            </div>

            <div className="space-y-2">
              <Label>Escrow Wallet Address (TRC20)</Label>
              <div className="flex gap-2">
                <code className="flex-1 p-3 bg-secondary rounded-lg text-sm font-mono break-all">{WALLET_ADDRESS}</code>
                <Button variant="outline" size="icon" onClick={copyAddress}><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Only send TRC20 USDT. Sending other tokens will result in permanent loss.</p>
            </div>

            <div className="space-y-2">
              <Label>Your Transaction Hash / TXID</Label>
              <Input placeholder="Paste your blockchain TXID..." value={txid} onChange={e => setTxid(e.target.value)} className="font-mono" />
              <p className="text-xs text-muted-foreground">Paste the transaction ID from your wallet after sending.</p>
            </div>

            <Button className="w-full h-12" disabled={!txid.trim() || txid.trim().length < 10 || createOrder.isPending}
              onClick={() => createOrder.mutate({ usdtAmount, txid, buyerId: selectedBuyer.id })}>
              {createOrder.isPending ? "Submitting..." : "Confirm & Open Trade"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );

  if (step === "chat" && order) return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{order.buyer.name[0]}</div>
          <div className="flex-1">
            <div className="font-semibold">{order.buyer.name}</div>
            <div className="text-sm text-muted-foreground">Trade #{order.id} • {parseFloat(order.usdtAmount as any).toFixed(2)} USDT → €{parseFloat(order.eurAmount as any).toFixed(2)}</div>
          </div>
          <Badge className={cn(order.status === "completed" ? "bg-green-500/20 text-green-500" : order.status === "rejected" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500")}>
            {order.status === "completed" ? <><CheckCircle className="h-3 w-3 mr-1" />Completed</> : order.status}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-0 flex flex-col h-[400px]">
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.senderType === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] px-4 py-2 rounded-2xl text-sm", msg.senderType === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm")}>
                    {msg.message}
                    <div className="text-xs opacity-60 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
            {order.status === "pending" && (
              <div className="border-t p-3 flex gap-2">
                <Input placeholder="Type a message..." value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && chatMessage.trim() && sendMessage.mutate(chatMessage)} />
                <Button size="icon" onClick={() => chatMessage.trim() && sendMessage.mutate(chatMessage)} disabled={sendMessage.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );

  return null;
}
