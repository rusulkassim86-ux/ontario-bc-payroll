import { Building2, Users, Clock, Calculator, FileText, Settings, BarChart3, Home, Shield, Database, Smartphone, Activity, Receipt, UserCog, Monitor, Zap, HardDrive, List, FileSpreadsheet, UserPlus, Code, FileArchive, FileCheck, Calendar, DollarSign } from "lucide-react";
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { SecurityStatusBadge } from "@/components/security/SecurityStatusBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useLocation } from "react-router-dom";
import { APP_FEATURES } from "@/config/features";

const getMenuGroups = () => {
  const baseGroups: Record<string, Array<{ title: string; url: string; icon: any }>> = {
    "Main": [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Quick Hire", url: "/hire/new", icon: UserPlus },
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Timesheets", url: "/timesheets", icon: Clock },
    ],
    "Payroll Processing": [
      { title: "Payroll Dashboard", url: "/payroll-dashboard", icon: DollarSign },
      { title: "Payroll", url: "/payroll", icon: Calculator },
      { title: "Pay Calendar", url: "/pay-calendar", icon: Calendar },
      ...(APP_FEATURES.timesheetsNotifications ? [{ title: "Payroll Inbox", url: "/payroll-inbox", icon: FileCheck }] : []),
      { title: "Pay Codes Master", url: "/pay-codes-master", icon: List },
    ],
    "Reports & Compliance": [
      { title: "Reports", url: "/reports", icon: BarChart3 },
      { title: "CRA Remittances", url: "/cra-remittances", icon: Receipt },
      { title: "CRA Year Pack & Filing", url: "/admin/cra-year-pack", icon: FileArchive },
      { title: "Payroll Calculator", url: "/payroll-calculator", icon: FileSpreadsheet },
    ],
    "Administration": [
      { title: "Company", url: "/company", icon: Building2 },
      ...(APP_FEATURES.timesheetsNotifications ? [{ title: "Notification Settings", url: "/notification-settings", icon: Settings }] : []),
      { title: "Codes Management", url: "/admin/codes", icon: Code },
      { title: "CRA Integration", url: "/admin/cra-integration", icon: Settings },
      { title: "User Management", url: "/user-management", icon: UserCog },
      { title: "Devices", url: "/devices", icon: Monitor },
      { title: "Device Mapping", url: "/device-mapping", icon: Smartphone },
      { title: "Punch Feed", url: "/punch-feed", icon: Zap },
      { title: "Punch Config", url: "/punch-config", icon: Settings },
    ],
    "Security": [
      { title: "Security Center", url: "/security-center", icon: Shield },
      { title: "Backup & Restore", url: "/backup-restore", icon: HardDrive },
    ],
  };
  
  return baseGroups;
};

export function AppSidebar() {
  const location = useLocation();
  const menuGroups = getMenuGroups();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PayrollPro</h1>
              <p className="text-xs text-muted-foreground">Canadian Payroll</p>
            </div>
          </div>
          {APP_FEATURES.timesheetsNotifications && <NotificationBell />}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {Object.entries(menuGroups).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                      className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                    >
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <SecurityStatusBadge />
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Canadian Payroll Compliance
          </p>
          <p className="text-xs font-medium text-foreground">
            ON & BC Certified
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}