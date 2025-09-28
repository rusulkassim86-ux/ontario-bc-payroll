import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { PayrollCalculator } from '@/components/payroll/PayrollCalculator';

const PayrollCalculatorPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="CRA Payroll Calculator"
          description="Upload employee data and CRA tax tables to generate payroll calculations and T4-ready outputs"
        />
        <PayrollCalculator />
      </div>
    </AppLayout>
  );
};

export default PayrollCalculatorPage;