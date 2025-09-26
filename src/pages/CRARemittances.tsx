import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRARemittanceReports } from "@/components/cra/CRARemittanceReports";
import { T4SlipManager } from "@/components/cra/T4SlipManager";
import { T4ASlipManager } from "@/components/cra/T4ASlipManager";
import { Receipt, FileText, Building2 } from "lucide-react";

export default function CRARemittances() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="CRA Remittances & Year-End" 
        description="Manage Canada Revenue Agency remittance obligations and year-end reporting"
      />
      
      <div className="px-6">
        <Tabs defaultValue="remittances" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="remittances" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Remittance Reports
            </TabsTrigger>
            <TabsTrigger value="t4" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              T4 Slips
            </TabsTrigger>
            <TabsTrigger value="t4a" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              T4A Slips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="remittances">
            <CRARemittanceReports />
          </TabsContent>

          <TabsContent value="t4">
            <T4SlipManager />
          </TabsContent>

          <TabsContent value="t4a">
            <T4ASlipManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}