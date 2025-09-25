import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./components/auth/AuthProvider";
import { AuthGuard } from "./components/auth/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import Employees from "./pages/Employees";
import UserManagement from "./pages/UserManagement";
import Timesheets from "./pages/Timesheets";
import IndividualTimecardMinimal from "./pages/IndividualTimecardMinimal";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import SecurityCenter from "./pages/SecurityCenter";
import BackupRestore from "./pages/BackupRestore";
import DeviceMapping from "./pages/DeviceMapping";
import PunchFeed from "./pages/PunchFeed";
import PunchConfig from "./pages/PunchConfig";
import Devices from "./pages/Devices";
import DevRoutes from "./pages/DevRoutes";
import NotFound from "./pages/NotFound";
import { HTTPSEnforcer } from "./components/security/HTTPSEnforcer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HTTPSEnforcer />
      <AuthProvider>
        <AuthGuard>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/company" element={<Company />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/timesheets" element={<Timesheets />} />
                <Route path="/timecard/:employeeId" element={<IndividualTimecardMinimal />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/security-center" element={<SecurityCenter />} />
                <Route path="/backup-restore" element={<BackupRestore />} />
                <Route path="/device-mapping" element={<DeviceMapping />} />
                <Route path="/punch-feed" element={<PunchFeed />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/punch-config" element={<PunchConfig />} />
                <Route path="/dev/routes" element={<DevRoutes />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </AuthGuard>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
