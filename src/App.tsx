import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import WorkforceProfile from "./pages/WorkforceProfile";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AuthGuard } from "./components/auth/AuthGuard";
import Dashboard from "./pages/Dashboard";
import PayCalendar from "./pages/PayCalendar";
import PayrollDashboard from "./pages/PayrollDashboard";
import Company from "./pages/Company";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import UserManagement from "./pages/UserManagement";
import Timesheets from "./pages/Timesheets";
import IndividualTimecardMinimal from "./pages/IndividualTimecardMinimal";
import BiWeeklyTimecard from "./pages/BiWeeklyTimecard";
import BiWeeklyTimecardADP from "./pages/BiWeeklyTimecardADP";
import TimecardRedirect from "./pages/TimecardRedirect";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import CRARemittances from "./pages/CRARemittances";
import SecurityCenter from "./pages/SecurityCenter";
import BackupRestore from "./pages/BackupRestore";
import DeviceMapping from "./pages/DeviceMapping";
import PunchFeed from "./pages/PunchFeed";
import PunchConfig from "./pages/PunchConfig";
import Devices from "./pages/Devices";
import DevRoutes from "./pages/DevRoutes";
import NotFound from "./pages/NotFound";
const AdminCodes = lazy(() => import('@/pages/AdminCodes'));
const CRAIntegration = lazy(() => import('@/pages/CRAIntegration'));
const CRAYearPack = lazy(() => import('@/pages/CRAYearPack'));
import { PayCodesMasterPage } from "./components/payroll/PayCodesMasterPage";
import { HTTPSEnforcer } from "./components/security/HTTPSEnforcer";
import QuickHire from "./pages/QuickHire";
import PayrollInbox from "./pages/PayrollInbox";
import NotificationSettings from "./pages/NotificationSettings";
import { APP_FEATURES } from "./config/features";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// Debug: Log all registered routes for verification
console.table([
  { path: "/", component: "Dashboard" },
  { path: "/company", component: "Company" },
  { path: "/employees", component: "Employees" },
  { path: "/user-management", component: "UserManagement" },
  { path: "/timesheets", component: "Timesheets" },
  { path: "/timecard/:employeeId", component: "IndividualTimecardMinimal" },
  { path: "/payroll", component: "Payroll" },
  { path: "/pay-codes-master", component: "PayCodesMasterPage" },
  { path: "/reports", component: "Reports" },
  { path: "/hire/new", component: "QuickHire" },
  { path: "/security-center", component: "SecurityCenter" },
  { path: "/backup-restore", component: "BackupRestore" },
  { path: "/device-mapping", component: "DeviceMapping" },
  { path: "/punch-feed", component: "PunchFeed" },
  { path: "/devices", component: "Devices" },
  { path: "/punch-config", component: "PunchConfig" },
  { path: "/dev/routes", component: "DevRoutes" },
  { path: "*", component: "NotFound" }
]);

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <HTTPSEnforcer />
          <AuthGuard>
            <Toaster />
            <Sonner />
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/company" element={<Company />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/:id" element={<EmployeeProfile />} />
                <Route path="/user-management" element={<UserManagement />} />
            <Route path="/timesheets" element={<Timesheets />} />
            <Route 
              path="/timecard/:employeeId/biweekly-adp" 
              element={
                <AuthGuard>
                  <BiWeeklyTimecardADP />
                </AuthGuard>
              } 
            />
            <Route 
              path="/timecard/:employeeId/biweekly" 
              element={
                <AuthGuard>
                  <BiWeeklyTimecard />
                </AuthGuard>
              } 
            />
            <Route path="/timecard/:employeeId" element={<IndividualTimecardMinimal />} />
            <Route path="/timecard" element={<TimecardRedirect />} />
                <Route path="/payroll" element={<Payroll />} />
          <Route path="/pay-calendar" element={<PayCalendar />} />
          <Route path="/payroll-dashboard" element={<PayrollDashboard />} />
                <Route path="/pay-codes-master" element={<PayCodesMasterPage />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/cra-remittances" element={<CRARemittances />} />
                <Route path="/payroll-calculator" element={
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {React.createElement(React.lazy(() => import('./pages/PayrollCalculator')))}
                  </React.Suspense>
                } />
                <Route path="/security-center" element={<SecurityCenter />} />
                <Route path="/backup-restore" element={<BackupRestore />} />
                <Route path="/device-mapping" element={<DeviceMapping />} />
                <Route path="/punch-feed" element={<PunchFeed />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/hire/new" element={<QuickHire />} />
                <Route path="/punch-config" element={<PunchConfig />} />
                
                {/* Notification features - only if enabled */}
                {APP_FEATURES.timesheetsNotifications && (
                  <>
                    <Route path="/payroll-inbox" element={<PayrollInbox />} />
                    <Route path="/notification-settings" element={<NotificationSettings />} />
                  </>
                )}
                
                <Route path="/dev/routes" element={<DevRoutes />} />
                <Route path="/admin/codes" element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <AdminCodes />
                  </Suspense>
                } />
                <Route path="/admin/cra-integration" element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <CRAIntegration />
                  </Suspense>
                } />
                <Route path="/admin/cra-year-pack" element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <CRAYearPack />
                  </Suspense>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </AuthGuard>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
