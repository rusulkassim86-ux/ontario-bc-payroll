import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeductionCodesManager } from '@/components/admin/DeductionCodesManager';
import { CostCentersManager } from '@/components/admin/CostCentersManager';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Code, Building } from 'lucide-react';

export default function AdminCodes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Codes Management"
        description="Manage ADP deduction codes and cost centers"
      />

      <Tabs defaultValue="deduction-codes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deduction-codes" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Deduction Codes
          </TabsTrigger>
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Cost Centers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deduction-codes">
          <DeductionCodesManager />
        </TabsContent>

        <TabsContent value="cost-centers">
          <CostCentersManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}