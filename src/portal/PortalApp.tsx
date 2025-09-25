import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PortalAuthProvider } from "./auth/PortalAuthProvider";
import { PortalAuthGuard } from "./auth/PortalAuthGuard";
import { PortalLayout } from "./components/layout/PortalLayout";
import { Dashboard } from "./pages/Dashboard";
import { MyTime } from "./pages/MyTime";
import { MyPay } from "./pages/MyPay";
import { TimeOff } from "./pages/TimeOff";
import { Profile } from "./pages/Profile";
import { Documents } from "./pages/Documents";
import { Approvals } from "./pages/Approvals";
import { Team } from "./pages/Team";
import { SignIn } from "./pages/SignIn";
import { EnrollTwoFA } from "./pages/EnrollTwoFA";
import { ResetPassword } from "./pages/ResetPassword";

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
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public routes */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/enroll-2fa" element={<EnrollTwoFA />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected routes */}
              <Route path="/*" element={
                <PortalAuthGuard>
                  <PortalLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/time" element={<MyTime />} />
                      <Route path="/pay" element={<MyPay />} />
                      <Route path="/timeoff" element={<TimeOff />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/documents" element={<Documents />} />
                      
                      {/* Manager-only routes */}
                      <Route path="/approvals" element={<Approvals />} />
                      <Route path="/team" element={<Team />} />
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </PortalLayout>
                </PortalAuthGuard>
              } />
            </Routes>
          </BrowserRouter>
        </PortalAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}