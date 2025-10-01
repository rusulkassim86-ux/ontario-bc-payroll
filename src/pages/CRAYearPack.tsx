import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CRAYearPackUpload } from '@/components/cra/CRAYearPackUpload';
import { T4XMLGenerator } from '@/components/cra/T4XMLGenerator';

const CRAYearPackPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="CRA Year Pack & Filing"
          description="Manage CRA tax rate packages and generate T4 XML for filing"
        />
        
        <Tabs defaultValue="year-pack" className="space-y-6">
          <TabsList>
            <TabsTrigger value="year-pack">Year Pack Upload</TabsTrigger>
            <TabsTrigger value="t4-filing">T4 XML Filing</TabsTrigger>
          </TabsList>

          <TabsContent value="year-pack" className="space-y-6">
            <CRAYearPackUpload />
          </TabsContent>

          <TabsContent value="t4-filing" className="space-y-6">
            <T4XMLGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CRAYearPackPage;
