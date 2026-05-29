import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { AdminRoute } from "@/components/admin-route";

// Public Pages
import Landing from "@/pages/public/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import Terms from "@/pages/public/terms";
import Privacy from "@/pages/public/privacy";
import Support from "@/pages/public/support";

// Authed Pages
import Dashboard from "@/pages/app/dashboard";
import Exchange from "@/pages/app/exchange";
import P2P from "@/pages/app/p2p";
import Savings from "@/pages/app/savings";
import Withdraw from "@/pages/app/withdraw";
import History from "@/pages/app/history";
import Profile from "@/pages/app/profile";
import Notifications from "@/pages/app/notifications";
import KYC from "@/pages/app/kyc";
import Referrals from "@/pages/app/referrals";
import RateAlerts from "@/pages/app/rate-alerts";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminUserDetail from "@/pages/admin/user-detail";
import AdminExchange from "@/pages/admin/exchange";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminSettings from "@/pages/admin/settings";
import AdminAuditLog from "@/pages/admin/audit";
import AdminKYC from "@/pages/admin/kyc";
import AdminBuyers from "@/pages/admin/buyers";
import AdminChat from "@/pages/admin/chat";
import AdminReviews from "@/pages/admin/reviews";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/support" component={Support} />

      {/* Authed */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/exchange" component={Exchange} />
      <ProtectedRoute path="/p2p" component={P2P} />
      <ProtectedRoute path="/savings" component={Savings} />
      <ProtectedRoute path="/withdraw" component={Withdraw} />
      <ProtectedRoute path="/history" component={History} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/kyc" component={KYC} />
      <ProtectedRoute path="/referrals" component={Referrals} />
      <ProtectedRoute path="/rate-alerts" component={RateAlerts} />

      {/* Admin */}
      <AdminRoute path="/admin" component={AdminDashboard} />
      <AdminRoute path="/admin/users" component={AdminUsers} />
      <AdminRoute path="/admin/users/:id" component={AdminUserDetail} />
      <AdminRoute path="/admin/exchange" component={AdminExchange} />
      <AdminRoute path="/admin/withdrawals" component={AdminWithdrawals} />
      <AdminRoute path="/admin/settings" component={AdminSettings} />
      <AdminRoute path="/admin/audit" component={AdminAuditLog} />
      <AdminRoute path="/admin/kyc" component={AdminKYC} />
      <AdminRoute path="/admin/buyers" component={AdminBuyers} />
      <AdminRoute path="/admin/chat" component={AdminChat} />
      <AdminRoute path="/admin/reviews" component={AdminReviews} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
