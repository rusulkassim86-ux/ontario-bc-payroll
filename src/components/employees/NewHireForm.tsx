import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  DollarSign, 
  Shield, 
  Building2, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle 
} from "lucide-react";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { PayrollGLStep } from "./steps/PayrollGLStep";
import { ComplianceStep } from "./steps/ComplianceStep";
import { BankingStep } from "./steps/BankingStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { useEmployees, type NewHireFormData } from "@/hooks/useEmployees";
import { Form } from "@/components/ui/form";

const newHireSchema = z.object({
  // Step 1: Basic Info
  first_name: z.string().min(1, "First name is required").max(50, "First name too long"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(10, "Invalid phone number").optional(),
  employee_number: z.string().min(1, "Employee number is required").max(20, "Employee number too long"),
  hire_date: z.string().min(1, "Hire date is required"),
  worksite_id: z.string().min(1, "Worksite is required"),
  fte_hours_per_week: z.number().min(1, "Hours must be greater than 0").max(80, "Hours cannot exceed 80"),
  reports_to_id: z.string().optional(),

  // Step 2: Payroll & GL
  province_code: z.string().min(1, "Province is required"),
  classification: z.string().optional(),
  union_id: z.string().optional(),
  step: z.number().optional(),
  gl_cost_center: z.string().optional(),
  overtime_eligible: z.boolean(),
  ot_multiplier: z.number().min(1, "OT multiplier must be at least 1").max(3, "OT multiplier too high"),
  vacation_policy_id: z.string().optional(),
  seniority_date: z.string().optional(),

  // Step 3: IDs & Compliance
  sin: z.string().optional(),
  work_eligibility: z.enum(['Citizen', 'PR', 'WorkPermit', 'Other']),
  permit_expiry: z.string().optional(),
  td1_federal_status: z.enum(['Pending', 'Received']),
  td1_provincial_status: z.enum(['Pending', 'Received']),
  probation_end: z.string().optional(),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postal_code: z.string().min(1, "Postal code is required"),
  }),

  // Step 4: Banking (Optional)
  banking_info: z.object({
    account_number: z.string(),
    routing_number: z.string(),
    bank_name: z.string(),
  }).optional(),

  // Step 5: Emergency & Documents
  primary_contact: z.object({
    name: z.string().min(1, "Emergency contact name is required"),
    relationship: z.string().min(1, "Relationship is required"),
    phone: z.string().min(10, "Invalid phone number"),
    email: z.string().email("Invalid email").optional(),
  }),
  secondary_contact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email("Invalid email").optional(),
  }).optional(),
}).refine((data) => {
  // Work permit validation
  if (data.work_eligibility === 'WorkPermit' && !data.permit_expiry) {
    return false;
  }
  if (data.work_eligibility === 'WorkPermit' && data.permit_expiry) {
    const expiryDate = new Date(data.permit_expiry);
    const today = new Date();
    return expiryDate > today;
  }
  return true;
}, {
  message: "Work permit expiry date is required and must be in the future",
  path: ["permit_expiry"]
});

const steps = [
  {
    id: 1,
    title: "Basic Info",
    description: "Personal and employment details",
    icon: User,
    color: "text-primary"
  },
  {
    id: 2,
    title: "Payroll & GL",
    description: "Compensation and accounting setup",
    icon: DollarSign,
    color: "text-success"
  },
  {
    id: 3,
    title: "IDs & Compliance",
    description: "Identity verification and work eligibility",
    icon: Shield,
    color: "text-accent"
  },
  {
    id: 4,
    title: "Banking",
    description: "Direct deposit information (optional)",
    icon: Building2,
    color: "text-warning"
  },
  {
    id: 5,
    title: "Emergency & Documents",
    description: "Emergency contacts and document uploads",
    icon: FileText,
    color: "text-destructive"
  }
];

interface NewHireFormProps {
  onSuccess?: (employee: any) => void;
  onCancel?: () => void;
}

export function NewHireForm({ onSuccess, onCancel }: NewHireFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [documents, setDocuments] = useState<File[]>([]);
  const { createEmployee } = useEmployees();

  const form = useForm<NewHireFormData>({
    resolver: zodResolver(newHireSchema),
    defaultValues: {
      fte_hours_per_week: 40,
      overtime_eligible: true,
      ot_multiplier: 1.5,
      work_eligibility: 'Citizen',
      td1_federal_status: 'Pending',
      td1_provincial_status: 'Pending',
      address: {
        street: '',
        city: '',
        province: '',
        postal_code: '',
      },
      primary_contact: {
        name: '',
        relationship: '',
        phone: '',
      },
    },
    mode: 'onChange',
  });

  const { watch, trigger, getValues } = form;
  const watchedValues = watch();

  // Calculate probation end date (90 days after hire date)
  const calculateProbationEnd = (hireDate: string) => {
    if (!hireDate) return '';
    const hire = new Date(hireDate);
    const probationEnd = new Date(hire);
    probationEnd.setDate(hire.getDate() + 90);
    return format(probationEnd, 'yyyy-MM-dd');
  };

  // Check if current step is valid
  const isStepValid = async (step: number) => {
    const fieldsToValidate = getStepFields(step);
    return await trigger(fieldsToValidate);
  };

  const getStepFields = (step: number): (keyof NewHireFormData)[] => {
    switch (step) {
      case 1:
        return ['first_name', 'last_name', 'employee_number', 'hire_date', 'worksite_id', 'fte_hours_per_week'];
      case 2:
        return ['province_code', 'overtime_eligible', 'ot_multiplier'];
      case 3:
        return ['work_eligibility', 'address'];
      case 4:
        return []; // Banking is optional
      case 5:
        return ['primary_contact'];
      default:
        return [];
    }
  };

  const nextStep = async () => {
    const isValid = await isStepValid(currentStep);
    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: NewHireFormData) => {
    // Auto-calculate probation end if not set
    if (!data.probation_end && data.hire_date) {
      data.probation_end = calculateProbationEnd(data.hire_date);
    }

    // Auto-set seniority date if not provided
    if (!data.seniority_date && data.hire_date) {
      data.seniority_date = data.hire_date;
    }

    // Add documents
    data.documents = documents;

    createEmployee.mutate(data, {
      onSuccess: (employee) => {
        onSuccess?.(employee);
      }
    });
  };

  const progress = (currentStep / steps.length) * 100;

  // Check for work permit expiry warning
  const showPermitWarning = () => {
    if (watchedValues.work_eligibility === 'WorkPermit' && watchedValues.permit_expiry) {
      const expiryDate = new Date(watchedValues.permit_expiry);
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 30); // 30 days warning
      
      if (expiryDate <= warningDate) {
        return true;
      }
    }
    return false;
  };

  return (
    <Form {...form}>
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">New Employee Onboarding</CardTitle>
              <p className="text-muted-foreground">Complete all steps to add a new employee</p>
            </div>
            <Badge variant="outline" className="text-sm">
              Step {currentStep} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-4">
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <Card 
              key={step.id} 
              className={`shadow-card transition-all cursor-pointer ${
                isActive ? 'ring-2 ring-primary border-primary bg-primary/5' : 
                isCompleted ? 'border-success bg-success/5' : 'border-border'
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <CardContent className="p-4 text-center">
                <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isCompleted ? 'bg-success text-success-foreground' : 'bg-muted'
                }`}>
                  <StepIcon className="w-4 h-4" />
                </div>
                <h3 className="font-medium text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Work Permit Warning */}
      {showPermitWarning() && (
        <Alert className="border-warning/20 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            Work permit expires within 30 days. Please ensure renewal is in progress.
          </AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep - 1].icon, { 
              className: `w-5 h-5 ${steps[currentStep - 1].color}` 
            })}
            {steps[currentStep - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && <BasicInfoStep form={form} />}
          {currentStep === 2 && <PayrollGLStep form={form} />}
          {currentStep === 3 && <ComplianceStep form={form} />}
          {currentStep === 4 && <BankingStep form={form} />}
          {currentStep === 5 && (
            <DocumentsStep 
              form={form} 
              documents={documents} 
              setDocuments={setDocuments} 
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex justify-between">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {onCancel && (
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {currentStep < 5 ? (
                <Button onClick={nextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={createEmployee.isPending}
                  className="bg-gradient-primary"
                >
                  {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </Form>
);
}