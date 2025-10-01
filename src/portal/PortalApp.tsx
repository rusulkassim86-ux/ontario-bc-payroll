import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PortalAuthProvider } from "./auth/PortalAuthProvider";
import { PortalAuthGuard } from "./auth/PortalAuthGuard";
import { PortalLayout } from "./components/layout/PortalLayout";
import { SignIn } from "./pages/SignIn";
import { Dashboard } from "./pages/Dashboard";
import { MyTime } from "./pages/MyTime";
import { MyPay } from "./pages/MyPay";
import { MyT4 } from "./pages/MyT4";
import { TimeOff } from "./pages/TimeOff";
import { Profile } from "./pages/Profile";
import { Documents } from "./pages/Documents";
import { Approvals } from "./pages/Approvals";
import { Team } from "./pages/Team";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export function PortalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PortalAuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
              {/* Public routes */}
              <Route path="/portal/signin" element={<SignIn />} />
              
              {/* Protected routes */}
              <Route path="/portal/*" element={
                <PortalAuthGuard>
                  <PortalLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/time" element={<MyTime />} />
                      <Route path="/pay" element={<MyPay />} />
                      <Route path="/t4" element={<MyT4 />} />
                      <Route path="/timeoff" element={<TimeOff />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/documents" element={<Documents />} />
                      
                      {/* Manager/Admin-only routes */}
                      <Route path="/approvals" element={
                        <PortalAuthGuard managerOnly>
                          <Approvals />
                        </PortalAuthGuard>
                      } />
                      <Route path="/team" element={
                        <PortalAuthGuard managerOnly>
                          <Team />
                        </PortalAuthGuard>
                      } />
                      
              <Route path="*" element={<Navigate to="/portal" replace />} />
                    </Routes>
                  </PortalLayout>
                </PortalAuthGuard>
              } />
            </Routes>
        </PortalAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}