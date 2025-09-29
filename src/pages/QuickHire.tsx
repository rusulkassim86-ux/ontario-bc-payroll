import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  User, 
  Building2, 
  FileText, 
  Calendar as CalendarIcon, 
  Eye, 
  EyeOff, 
  Info,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NewHireFormData {
  // Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  payrollName: string;
  taxIdType: string;
  sin: string;
  sinNotProvided: boolean;
  nationalIdentifier: string;
  insuranceGender: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  province: string;
  postalCode: string;
  hireDate: Date | null;
  hireReason: string;
  associateId: string;
  companyCode: string;
  birthDate: Date | null;
  
  // Employment and Payroll
  fileNumber: string;
  rateType: string;
  payFrequency: string;
  homeDepartment: string;
  regularPayRate: string;
  annualSalary: string;
  standardHours: string;
  dataControl: string;
  workEmail: string;
  useForNotification: boolean;
  clockType: string;
  fte: string;
  assignedShift: string;
  
  // Tax
  taxWorkedInProvince: string;
  suppressROE: boolean;
  taxReportingInfo: string;
  employerDentalBenefits: string;
  
  // Additional
  hiringExistingCandidate: boolean;
  assignOnboarding: boolean;
  onboardingPackage: string;
}

const initialFormData: NewHireFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  payrollName: '',
  taxIdType: 'SIN',
  sin: '',
  sinNotProvided: false,
  nationalIdentifier: 'CAN',
  insuranceGender: '',
  country: 'Canada',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  city: '',
  province: '',
  postalCode: '',
  hireDate: null,
  hireReason: '',
  associateId: '',
  companyCode: '',
  birthDate: null,
  fileNumber: '',
  rateType: 'Hourly',
  payFrequency: 'Biweekly',
  homeDepartment: '',
  regularPayRate: '',
  annualSalary: '',
  standardHours: '40',
  dataControl: '',
  workEmail: '',
  useForNotification: false,
  clockType: 'None',
  fte: '1.0',
  assignedShift: '',
  taxWorkedInProvince: '',
  suppressROE: false,
  taxReportingInfo: '',
  employerDentalBenefits: 'Unknown',
  hiringExistingCandidate: false,
  assignOnboarding: false,
  onboardingPackage: ''
};

const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' }
];

export default function QuickHire() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<NewHireFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSIN, setShowSIN] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-save draft every 10 seconds
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setInterval(() => {
      localStorage.setItem('quickHireDraft', JSON.stringify(formData));
    }, 10000);

    return () => clearInterval(timer);
  }, [formData, isDirty]);

  // Load draft on component mount
  useEffect(() => {
    const draft = localStorage.getItem('quickHireDraft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        setFormData({ ...initialFormData, ...parsedDraft });
        toast({
          title: "Draft Restored",
          description: "Your previous work has been restored.",
        });
      } catch (error) {
        console.error('Failed to parse draft:', error);
      }
    }
  }, []);

  // Update payroll name when name fields change
  useEffect(() => {
    const { lastName, firstName, middleName } = formData;
    if (lastName || firstName) {
      const payrollName = [lastName, firstName, middleName].filter(Boolean).join(', ');
      setFormData(prev => ({ ...prev, payrollName }));
    }
  }, [formData.firstName, formData.middleName, formData.lastName]);

  // Auto-generate Associate ID
  useEffect(() => {
    if (formData.companyCode && !formData.associateId) {
      generateAssociateId();
    }
  }, [formData.companyCode]);

  // Sync tax province with address province
  useEffect(() => {
    if (formData.province && !formData.taxWorkedInProvince) {
      setFormData(prev => ({ ...prev, taxWorkedInProvince: prev.province }));
    }
  }, [formData.province]);

  const generateAssociateId = async () => {
    try {
      // Generate a unique employee number with company prefix
      const prefix = formData.companyCode || '001';
      const timestamp = Date.now().toString().slice(-6);
      const associateId = `${prefix}${timestamp}`;
      
      setFormData(prev => ({ ...prev, associateId }));
    } catch (error) {
      console.error('Failed to generate associate ID:', error);
    }
  };

  const handleInputChange = (field: keyof NewHireFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatPostalCode = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Format as A1A 1A1
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
    }
    return cleaned;
  };

  const formatSIN = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as XXX XXX XXX
    if (cleaned.length >= 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
    } else if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.province.trim()) newErrors.province = 'Province is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    if (!formData.hireDate) newErrors.hireDate = 'Hire date is required';
    if (!formData.companyCode.trim()) newErrors.companyCode = 'Company code is required';
    if (!formData.payFrequency.trim()) newErrors.payFrequency = 'Pay frequency is required';
    
    // SIN validation
    if (!formData.sinNotProvided && !formData.sin.trim()) {
      newErrors.sin = 'SIN is required';
    }

    // Postal code format validation (Canadian)
    if (formData.postalCode && formData.country === 'Canada') {
      const postalRegex = /^[A-Z]\d[A-Z] \d[A-Z]\d$/;
      if (!postalRegex.test(formData.postalCode)) {
        newErrors.postalCode = 'Invalid Canadian postal code format (A1A 1A1)';
      }
    }

    // Age validation (minimum 14 years old)
    if (formData.birthDate) {
      const today = new Date();
      const minAge = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());
      if (formData.birthDate > minAge) {
        newErrors.birthDate = 'Employee must be at least 14 years old';
      }
    }

    // Employment validations
    if (formData.rateType === 'Hourly') {
      if (!formData.regularPayRate || parseFloat(formData.regularPayRate) <= 0) {
        newErrors.regularPayRate = 'Valid hourly rate is required';
      }
      if (!formData.standardHours || parseFloat(formData.standardHours) <= 0 || parseFloat(formData.standardHours) > 80) {
        newErrors.standardHours = 'Standard hours must be between 0 and 80';
      }
    } else if (formData.rateType === 'Salary') {
      if (!formData.annualSalary || parseFloat(formData.annualSalary) <= 0) {
        newErrors.annualSalary = 'Valid annual salary is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForDuplicates = async () => {
    try {
      let duplicateFound = false;
      let duplicateMessage = '';

      // Check for SIN duplicate
      if (!formData.sinNotProvided && formData.sin) {
        const { data: sinMatch } = await supabase
          .from('employees')
          .select('first_name, last_name, employee_number')
          .eq('sin_encrypted', formData.sin.replace(/\s/g, ''))
          .limit(1);

        if (sinMatch && sinMatch.length > 0) {
          duplicateFound = true;
          duplicateMessage += `SIN already exists for ${sinMatch[0].first_name} ${sinMatch[0].last_name} (${sinMatch[0].employee_number}). `;
        }
      }

      // Check for name + birth date duplicate
      if (formData.firstName && formData.lastName && formData.birthDate) {
        const { data: nameMatch } = await supabase
          .from('employees')
          .select('first_name, last_name, employee_number')
          .eq('first_name', formData.firstName)
          .eq('last_name', formData.lastName)
          .limit(1);

        if (nameMatch && nameMatch.length > 0) {
          duplicateFound = true;
          duplicateMessage += `Similar employee found: ${nameMatch[0].first_name} ${nameMatch[0].last_name} (${nameMatch[0].employee_number}).`;
        }
      }

      if (duplicateFound) {
        return window.confirm(`Potential duplicate found: ${duplicateMessage} Do you want to continue?`);
      }

      return true;
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return true; // Allow submission if check fails
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    const canProceed = await checkForDuplicates();
    if (!canProceed) return;

    setIsSubmitting(true);

    try {
      // Create employee record with required fields
      const employeeData = {
        company_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from current user's company
        worksite_id: '00000000-0000-0000-0000-000000000000', // TODO: Set appropriate worksite
        employee_number: formData.associateId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.workEmail,
        phone: '',
        sin_encrypted: formData.sinNotProvided ? null : formData.sin.replace(/\s/g, ''),
        province_code: formData.province,
        hire_date: formData.hireDate?.toISOString().split('T')[0],
        job_title: '',
        business_unit: formData.companyCode,
        location: formData.province,
        company_code: formData.companyCode,
        pay_frequency: formData.payFrequency.toLowerCase(),
        salary: formData.rateType === 'Salary' ? parseFloat(formData.annualSalary) || null : parseFloat(formData.regularPayRate) || null,
        annual_salary: formData.rateType === 'Salary' ? parseFloat(formData.annualSalary) || null : null,
        standard_hours: parseFloat(formData.standardHours) || null,
        fte: parseFloat(formData.fte) || 1.0,
        assigned_shift: formData.assignedShift || 'Day Shift',
        status: 'active',
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          line3: formData.addressLine3,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          country: formData.country
        },
        td1_federal: {},
        td1_provincial: {},
        cpp_exempt: false,
        ei_exempt: false
      };

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Clear draft
      localStorage.removeItem('quickHireDraft');

      toast({
        title: "Employee Created Successfully",
        description: `${formData.firstName} ${formData.lastName} (${formData.associateId}) has been added to the system.`,
      });

      // Show success options
      const action = window.confirm(
        `Employee created successfully!\n\nChoose an action:\nOK - Go to Employee Profile\nCancel - Add Another Employee`
      );

      if (action) {
        navigate(`/employees/${employee.id}`);
      } else {
        // Reset form for another hire
        setFormData(initialFormData);
        setErrors({});
        setIsDirty(false);
      }

    } catch (error) {
      console.error('Failed to create employee:', error);
      toast({
        title: "Error Creating Employee",
        description: "Please check the form and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const InfoTooltip = ({ content }: { content: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-blue-600">
          <Info className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm">
        {content}
      </PopoverContent>
    </Popover>
  );

  const FormField = ({ 
    label, 
    required = false, 
    tooltip, 
    error, 
    children 
  }: { 
    label: string;
    required?: boolean;
    tooltip?: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      {children}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            Quick Hire
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {['Personal Information', 'Employment & Payroll', 'Tax'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                  index <= currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {index + 1}
                </div>
                <span className={cn(
                  "ml-2 text-sm font-medium",
                  index <= currentStep ? "text-blue-600" : "text-gray-500"
                )}>
                  {step}
                </span>
                {index < 2 && (
                  <div className={cn(
                    "w-12 h-0.5 ml-4",
                    index < currentStep ? "bg-blue-600" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section 1: Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
              
              {/* Options */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="existingCandidate"
                    checked={formData.hiringExistingCandidate}
                    onCheckedChange={(checked) => 
                      handleInputChange('hiringExistingCandidate', !!checked)
                    }
                  />
                  <Label htmlFor="existingCandidate" className="text-sm">
                    Hiring an existing candidate?
                  </Label>
                  {formData.hiringExistingCandidate && (
                    <Button variant="outline" size="sm">
                      Select Candidate
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="assignOnboarding"
                    checked={formData.assignOnboarding}
                    onCheckedChange={(checked) => 
                      handleInputChange('assignOnboarding', !!checked)
                    }
                  />
                  <Label htmlFor="assignOnboarding" className="text-sm">
                    Assign Onboarding Experience
                  </Label>
                  {formData.assignOnboarding && (
                    <Select
                      value={formData.onboardingPackage}
                      onValueChange={(value) => handleInputChange('onboardingPackage', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Choose package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Onboarding</SelectItem>
                        <SelectItem value="manager">Manager Onboarding</SelectItem>
                        <SelectItem value="executive">Executive Onboarding</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Name Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="First Name" required error={errors.firstName}>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="First name"
                  />
                </FormField>
                
                <FormField label="Middle Name">
                  <Input
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder="Middle name"
                  />
                </FormField>
                
                <FormField label="Last Name" required error={errors.lastName}>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Last name"
                  />
                </FormField>
              </div>

              <FormField label="Payroll Name" tooltip="Automatically generated from name fields">
                <Input
                  value={formData.payrollName}
                  readOnly
                  className="bg-gray-50"
                />
              </FormField>

              {/* Tax ID Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Tax ID Type">
                  <Select
                    value={formData.taxIdType}
                    onValueChange={(value) => handleInputChange('taxIdType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIN">Canada Social Insurance Number (SIN)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField 
                  label="Tax ID (SIN)" 
                  required={!formData.sinNotProvided}
                  error={errors.sin}
                  tooltip="Social Insurance Number - will be encrypted and masked for security"
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showSIN ? "text" : "password"}
                        value={formData.sin}
                        onChange={(e) => handleInputChange('sin', formatSIN(e.target.value))}
                        placeholder="*** *** ***"
                        maxLength={11}
                        disabled={formData.sinNotProvided}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowSIN(!showSIN)}
                        disabled={formData.sinNotProvided}
                      >
                        {showSIN ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sinNotProvided"
                        checked={formData.sinNotProvided}
                        onCheckedChange={(checked) => {
                          handleInputChange('sinNotProvided', !!checked);
                          if (checked) {
                            handleInputChange('sin', '');
                          }
                        }}
                      />
                      <Label htmlFor="sinNotProvided" className="text-sm">
                        Not Provided
                      </Label>
                    </div>
                  </div>
                </FormField>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Gender for Insurance Coverage">
                  <Select
                    value={formData.insuranceGender}
                    onValueChange={(value) => handleInputChange('insuranceGender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="National Identifier">
                  <Input
                    value={formData.nationalIdentifier}
                    onChange={(e) => handleInputChange('nationalIdentifier', e.target.value)}
                    placeholder="CAN - Canada"
                  />
                </FormField>
              </div>

              {/* Address */}
              <FormField label="Country" required error={errors.country}>
                <Select
                  value={formData.country}
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Address Line 1" required error={errors.addressLine1}>
                <Input
                  value={formData.addressLine1}
                  onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                  placeholder="Street address"
                />
              </FormField>

              <FormField label="Address Line 2">
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </FormField>

              <FormField label="Address Line 3">
                <Input
                  value={formData.addressLine3}
                  onChange={(e) => handleInputChange('addressLine3', e.target.value)}
                  placeholder="Additional address info"
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="City" required error={errors.city}>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </FormField>
                
                <FormField label="Province / Territory" required error={errors.province}>
                  <Select
                    value={formData.province}
                    onValueChange={(value) => handleInputChange('province', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES.map(province => (
                        <SelectItem key={province.value} value={province.value}>
                          {province.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="Postal Code" required error={errors.postalCode}>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', formatPostalCode(e.target.value))}
                    placeholder="A1A 1A1"
                    maxLength={7}
                  />
                </FormField>
              </div>

              {/* Dates and IDs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Hire Date" required error={errors.hireDate}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !formData.hireDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.hireDate ? format(formData.hireDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.hireDate || undefined}
                        onSelect={(date) => handleInputChange('hireDate', date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </FormField>
                
                <FormField label="Birth Date" error={errors.birthDate}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !formData.birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.birthDate ? format(formData.birthDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.birthDate || undefined}
                        onSelect={(date) => handleInputChange('birthDate', date)}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Reason for Hire">
                  <Select
                    value={formData.hireReason}
                    onValueChange={(value) => handleInputChange('hireReason', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new-position">New Position</SelectItem>
                      <SelectItem value="replacement">Replacement</SelectItem>
                      <SelectItem value="expansion">Business Expansion</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField label="Associate ID" tooltip="Auto-generated based on company code">
                  <Input
                    value={formData.associateId}
                    onChange={(e) => handleInputChange('associateId', e.target.value)}
                    placeholder="Auto-generated"
                  />
                </FormField>
              </div>

              <FormField label="Company Code" required error={errors.companyCode}>
                <Select
                  value={formData.companyCode}
                  onValueChange={(value) => handleInputChange('companyCode', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="001">001 - Main Company</SelectItem>
                    <SelectItem value="72S">72S - Union Division</SelectItem>
                    <SelectItem value="72R">72R - Non-Union Division</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          {/* Section 2: Employment and Payroll + Section 3: Tax */}
          <div className="space-y-8">
            {/* Employment and Payroll */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Employment and Payroll
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="File #">
                    <Input
                      value={formData.fileNumber}
                      onChange={(e) => handleInputChange('fileNumber', e.target.value)}
                      placeholder="File number"
                    />
                  </FormField>
                  
                  <FormField label="Rate Type" required>
                    <Select
                      value={formData.rateType}
                      onValueChange={(value) => handleInputChange('rateType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Pay Frequency" required error={errors.payFrequency}>
                    <Select
                      value={formData.payFrequency}
                      onValueChange={(value) => handleInputChange('payFrequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Biweekly">Biweekly</SelectItem>
                        <SelectItem value="Semi-Monthly">Semi-Monthly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  
                  <FormField label="Home Department">
                    <Select
                      value={formData.homeDepartment}
                      onValueChange={(value) => handleInputChange('homeDepartment', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="it">Information Technology</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                {/* Conditional Pay Rate Fields */}
                {formData.rateType === 'Hourly' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Regular Pay Rate" required error={errors.regularPayRate}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          value={formData.regularPayRate}
                          onChange={(e) => handleInputChange('regularPayRate', e.target.value)}
                          placeholder="0.00"
                          className="pl-8"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </FormField>
                    
                    <FormField label="Standard Hours" required error={errors.standardHours}>
                      <Input
                        type="number"
                        value={formData.standardHours}
                        onChange={(e) => handleInputChange('standardHours', e.target.value)}
                        placeholder="40"
                        step="0.1"
                        min="0"
                        max="80"
                      />
                    </FormField>
                  </div>
                )}

                {formData.rateType === 'Salary' && (
                  <FormField label="Annual Salary" required error={errors.annualSalary}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={formData.annualSalary}
                        onChange={(e) => handleInputChange('annualSalary', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        step="1000"
                        min="0"
                      />
                    </div>
                  </FormField>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Data Control">
                    <Select
                      value={formData.dataControl}
                      onValueChange={(value) => handleInputChange('dataControl', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select control" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  
                  <FormField label="Clock">
                    <Select
                      value={formData.clockType}
                      onValueChange={(value) => handleInputChange('clockType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Web">Web</SelectItem>
                        <SelectItem value="Physical">Physical</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <FormField label="Work Email">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      value={formData.workEmail}
                      onChange={(e) => handleInputChange('workEmail', e.target.value)}
                      placeholder="employee@company.com"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useForNotification"
                        checked={formData.useForNotification}
                        onCheckedChange={(checked) => handleInputChange('useForNotification', !!checked)}
                      />
                      <Label htmlFor="useForNotification" className="text-sm">
                        Use For Notification
                      </Label>
                    </div>
                  </div>
                </FormField>

                {/* Work Schedule */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-4">Work Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="FTE">
                      <Input
                        type="number"
                        value={formData.fte}
                        onChange={(e) => handleInputChange('fte', e.target.value)}
                        placeholder="1.0"
                        step="0.1"
                        min="0"
                        max="1"
                      />
                    </FormField>
                    
                    <FormField label="Assigned Shift">
                      <Select
                        value={formData.assignedShift}
                        onValueChange={(value) => handleInputChange('assignedShift', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Day Shift">Day Shift</SelectItem>
                          <SelectItem value="Evening Shift">Evening Shift</SelectItem>
                          <SelectItem value="Night Shift">Night Shift</SelectItem>
                          <SelectItem value="Rotating">Rotating</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Tax
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <FormField label="Worked in Province">
                  <Select
                    value={formData.taxWorkedInProvince}
                    onValueChange={(value) => handleInputChange('taxWorkedInProvince', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES.map(province => (
                        <SelectItem key={province.value} value={province.value}>
                          {province.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="suppressROE"
                    checked={formData.suppressROE}
                    onCheckedChange={(checked) => handleInputChange('suppressROE', !!checked)}
                  />
                  <Label htmlFor="suppressROE" className="text-sm">
                    Suppress ROE
                  </Label>
                  <InfoTooltip content="Check to suppress Record of Employment generation for this employee" />
                </div>

                <FormField label="Tax Reporting Information">
                  <Textarea
                    value={formData.taxReportingInfo}
                    onChange={(e) => handleInputChange('taxReportingInfo', e.target.value)}
                    placeholder="Additional tax reporting notes..."
                    rows={3}
                  />
                </FormField>

                <FormField label="Employer-Offered Dental Benefits">
                  <Select
                    value={formData.employerDentalBenefits}
                    onValueChange={(value) => handleInputChange('employerDentalBenefits', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              {isDirty && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Save className="h-4 w-4" />
                  Changes are auto-saved
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/employees')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-w-24"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom padding to account for sticky footer */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}