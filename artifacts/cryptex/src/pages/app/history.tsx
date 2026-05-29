import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useGetTransactionHistory, getGetTransactionHistoryQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowRightLeft, PiggyBank, Landmark, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function History() {
  const [tab, setTab] = useState<"all" | "exchange" | "savings" | "withdrawal">("all");
  const { data: history, isLoading } = useGetTransactionHistory({ query: { queryKey: getGetTransactionHistoryQueryKey({ type: tab }) } });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
      case "active": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
      case "early_withdrawn": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const renderExchange = (item: any) => (
    <div key={`ex-${item.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className="bg-blue-500/10 p-2 rounded-full text-blue-500 mt-1">
          <ArrowRightLeft className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Sold {item.usdtAmount.toFixed(2)} USDT</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground font-mono">TXID: {item.txid.substring(0,8)}...{item.txid.substring(item.txid.length-8)}</span>
            <span className="text-xs text-muted-foreground">• {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}</span>
          </div>
          {item.rejectionReason && <p className="text-xs text-red-500 mt-1">Reason: {item.rejectionReason}</p>}
        </div>
      </div>
      <div className="mt-4 sm:mt-0 text-left sm:text-right">
        <p className="font-mono font-bold text-green-500">+€{item.eurAmount.toFixed(2)}</p>
        <div className="flex items-center justify-start sm:justify-end gap-1 mt-1">
          {getStatusIcon(item.status)}
          <span className="text-xs capitalize text-muted-foreground">{item.status}</span>
        </div>
      </div>
    </div>
  );

  const renderSavings = (item: any) => (
    <div key={`sav-${item.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 p-2 rounded-full text-primary mt-1">
          <PiggyBank className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Savings Plan ({item.durationDays} Days)</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{item.dailyRate}% daily rate</span>
            <span className="text-xs text-muted-foreground">• Started {format(new Date(item.startDate), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 sm:mt-0 text-left sm:text-right">
        <p className="font-mono font-bold">€{item.amount.toFixed(2)}</p>
        <p className="text-xs font-mono text-green-500 mt-1">+€{item.profitEarned.toFixed(2)} earned</p>
        <div className="flex items-center justify-start sm:justify-end gap-1 mt-1">
          {getStatusIcon(item.status)}
          <span className="text-xs capitalize text-muted-foreground">{item.status.replace('_', ' ')}</span>
        </div>
      </div>
    </div>
  );

  const renderWithdrawal = (item: any) => (
    <div key={`wd-${item.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className="bg-purple-500/10 p-2 rounded-full text-purple-500 mt-1">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Withdrawal ({item.method.replace('_', ' ').toUpperCase()})</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">• {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}</span>
          </div>
          {item.status === 'completed' && item.processedAt && (
            <p className="text-xs text-green-500 mt-1">Processed: {format(new Date(item.processedAt), "MMM d, yyyy")}</p>
          )}
        </div>
      </div>
      <div className="mt-4 sm:mt-0 text-left sm:text-right">
        <p className="font-mono font-bold text-foreground">-€{item.amount.toFixed(2)}</p>
        <div className="flex items-center justify-start sm:justify-end gap-1 mt-1">
          {getStatusIcon(item.status)}
          <span className="text-xs capitalize text-muted-foreground">{item.status}</span>
        </div>
      </div>
    </div>
  );

  // Combine and sort for "all" tab
  const allItems = [];
  if (history) {
    if (tab === "all" || tab === "exchange") {
      history.exchanges.forEach((item: any) => allItems.push({ ...item, _type: 'exchange', _date: new Date(item.createdAt).getTime() }));
    }
    if (tab === "all" || tab === "savings") {
      history.savings.forEach((item: any) => allItems.push({ ...item, _type: 'savings', _date: new Date(item.startDate).getTime() }));
    }
    if (tab === "all" || tab === "withdrawal") {
      history.withdrawals.forEach((item: any) => allItems.push({ ...item, _type: 'withdrawal', _date: new Date(item.createdAt).getTime() }));
    }
    allItems.sort((a, b) => b._date - a._date);
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Transaction History</h1>
          <p className="text-muted-foreground">View your past exchanges, savings plans, and withdrawals.</p>
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="exchange">Exchanges</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
          </TabsList>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : allItems.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No transactions found for this category.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {allItems.map((item: any) => {
                    if (item._type === 'exchange') return renderExchange(item);
                    if (item._type === 'savings') return renderSavings(item);
                    if (item._type === 'withdrawal') return renderWithdrawal(item);
                    return null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </AppLayout>
  );
}
