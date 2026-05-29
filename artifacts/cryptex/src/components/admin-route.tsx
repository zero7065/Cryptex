import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route, RouteProps } from "wouter";

export function AdminRoute({ component: Component, ...rest }: RouteProps) {
  const { user, isHydrating } = useAuth();

  if (isHydrating) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!user.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <Route {...rest} component={Component} />;
}
