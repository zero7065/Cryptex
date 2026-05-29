import { AppLayout } from "@/components/layout/app-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type TradeChat = { tradeId: number; userId: number; userEmail: string; username: string; status: string; usdtAmount: number; eurAmount: number; unreadMessages: number; lastMessage: string | null; createdAt: string };
type ChatMsg = { id: number; senderType: string; message: string; createdAt: string };

export default function AdminChatPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedTrade, setSelectedTrade] = useState<TradeChat | null>(null);
  const [message, setMessage] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const { data: trades = [], isLoading } = useQuery<TradeChat[]>({
    queryKey: ["admin-chats"],
    queryFn: () => apiGet("/admin/chats"),
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery<ChatMsg[]>({
    queryKey: ["admin-chat-msgs", selectedTrade?.tradeId],
    queryFn: () => apiGet(`/admin/chats/${selectedTrade!.tradeId}`),
    enabled: !!selectedTrade,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const sendMsg = useMutation({
    mutationFn: (msg: string) => apiPost(`/admin/chats/${selectedTrade!.tradeId}/message`, { message: msg }),
    onSuccess: () => { setMessage(""); qc.invalidateQueries({ queryKey: ["admin-chat-msgs", selectedTrade?.tradeId] }); qc.invalidateQueries({ queryKey: ["admin-chats"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalUnread = trades.reduce((s, t) => s + t.unreadMessages, 0);

  return (
    <AppLayout>
      <div className="space-y-4 animate-in fade-in duration-500 h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" />Trade Chat</h1>
          {totalUnread > 0 && <Badge className="bg-primary text-primary-foreground">{totalUnread} unread</Badge>}
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Trade List */}
          <div className="w-80 shrink-0 flex flex-col gap-2 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
            ) : trades.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No active trades</div>
            ) : trades.map(trade => (
              <button key={trade.tradeId} onClick={() => setSelectedTrade(trade)} className={cn(
                "w-full text-left p-4 rounded-xl border transition-colors",
                selectedTrade?.tradeId === trade.tradeId ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-secondary/50"
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm shrink-0">{(trade.username || trade.userEmail)?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate">{trade.username || trade.userEmail?.split("@")[0]}</span>
                      {trade.unreadMessages > 0 && <Badge className="bg-primary text-primary-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full shrink-0">{trade.unreadMessages}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">Trade #{trade.tradeId} • {trade.usdtAmount.toFixed(0)} USDT</div>
                    {trade.lastMessage && <div className="text-xs text-muted-foreground truncate mt-0.5">{trade.lastMessage}</div>}
                  </div>
                </div>
                <div className="mt-2">
                  <Badge className={cn("text-xs", trade.status === "completed" ? "bg-green-500/20 text-green-500" : trade.status === "rejected" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500")}>
                    {trade.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Panel */}
          <Card className="flex-1 flex flex-col min-h-0">
            {!selectedTrade ? (
              <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Select a trade to view chat</p></div>
              </CardContent>
            ) : (
              <>
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                  <div>
                    <div className="font-semibold">{selectedTrade.username || selectedTrade.userEmail}</div>
                    <div className="text-sm text-muted-foreground">Trade #{selectedTrade.tradeId} • {selectedTrade.usdtAmount.toFixed(2)} USDT → €{selectedTrade.eurAmount.toFixed(2)}</div>
                  </div>
                  <Badge className={selectedTrade.status === "completed" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}>{selectedTrade.status}</Badge>
                </div>

                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={cn("flex gap-2", msg.senderType === "admin" ? "justify-end" : "justify-start")}>
                      {msg.senderType === "user" && <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1"><User className="h-4 w-4" /></div>}
                      <div className={cn("max-w-[70%] px-4 py-2 rounded-2xl text-sm", msg.senderType === "admin" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm")}>
                        {msg.senderType === "admin" && <div className="text-xs opacity-70 mb-1 flex items-center gap-1"><Shield className="h-3 w-3" />You (Seller)</div>}
                        {msg.message}
                        <div className="text-xs opacity-60 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t flex gap-2 shrink-0">
                  <Input placeholder="Type as seller..." value={message} onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && message.trim() && sendMsg.mutate(message)} />
                  <Button size="icon" onClick={() => message.trim() && sendMsg.mutate(message)} disabled={sendMsg.isPending}><Send className="h-4 w-4" /></Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
