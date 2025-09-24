import { Building2, Users, Clock, Calculator, FileText, Settings, BarChart3, Home } from "lucide-react";
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
import { useLocation } from "react-router-dom";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Company Setup", url: "/company", icon: Building2 },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Time & Attendance", url: "/timesheets", icon: Clock },
  { title: "Payroll", url: "/payroll", icon: Calculator },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">PayrollPro</h1>
            <p className="text-xs text-muted-foreground">Canadian Payroll</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="p-4">
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