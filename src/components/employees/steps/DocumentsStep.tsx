import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, X, Shield } from "lucide-react";
import { type NewHireFormData } from "@/hooks/useEmployees";

interface DocumentsStepProps {
  form: UseFormReturn<NewHireFormData>;
  documents: File[];
  setDocuments: (files: File[]) => void;
}

export function DocumentsStep({ form, documents, setDocuments }: DocumentsStepProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setDocuments([...documents, ...newFiles]);
    }
    event.target.value = ''; // Reset input
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocuments);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Emergency Contacts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Emergency Contacts</h3>
        
        {/* Primary Contact */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Primary Emergency Contact *</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_contact.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_contact.relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship *</FormLabel>
                    <FormControl>
                      <Input placeholder="Spouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_contact.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_contact.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Secondary Contact */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Secondary Emergency Contact (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="secondary_contact.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_contact.relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Brother" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_contact.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 987-6543" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_contact.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Uploads */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Document Uploads</h3>
        
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Upload important documents such as ID, work permits, TD1 forms, offer letters, and policy acknowledgments. 
            All documents are stored securely and encrypted.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-foreground">
                    Click to upload documents
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    PDF, DOC, DOCX, JPG, PNG up to 10MB each
                  </span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          {documents.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Documents ({documents.length})</h4>
              {documents.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Document Types</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Government-issued photo ID</li>
            <li>• Work permit (if applicable)</li>
            <li>• Federal and Provincial TD1 forms</li>
            <li>• Signed offer letter</li>
            <li>• Policy acknowledgment forms</li>
            <li>• Other relevant employment documents</li>
          </ul>
        </div>
      </div>
    </div>
  );
}