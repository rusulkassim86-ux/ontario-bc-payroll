import { Routes, Route, Navigate } from "react-router-dom";
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

export function PortalApp() {
  return (
    <PortalAuthProvider>
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
  );
}