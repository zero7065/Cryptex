import { AppLayout } from "@/components/layout/app-layout";
import { useAdminGetAuditLog } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Activity } from "lucide-react";

export default function AdminAuditLog() {
  const { data, isLoading } = useAdminGetAuditLog({ query: { limit: 100 } });

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Log</h1>
          <p className="text-muted-foreground">Immutable record of admin actions.</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Loading log...</TableCell></TableRow>
                ) : data?.entries.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">No audit logs found.</TableCell></TableRow>
                ) : (
                  data?.entries.map(entry => (
                    <TableRow key={entry.id} className="text-xs hover:bg-secondary/20">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.createdAt), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">{entry.adminEmail}</TableCell>
                      <TableCell>
                        <span className="bg-secondary px-2 py-1 rounded text-primary font-mono">{entry.action}</span>
                      </TableCell>
                      <TableCell>{entry.targetUserEmail || '-'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {entry.details ? JSON.stringify(entry.details).substring(0, 50) + (JSON.stringify(entry.details).length > 50 ? '...' : '') : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
