import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { LegacyEmployee } from '@/types/employee';
import { format } from 'date-fns';

interface PersonalTabProps {
  employee: LegacyEmployee;
  isEditing: boolean;
  editData: any;
  onFieldChange: (field: string, value: any) => void;
}

export function PersonalTab({ employee, isEditing, editData, onFieldChange }: PersonalTabProps) {
  const [showFullSIN, setShowFullSIN] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: '', relationship: '', phone: '', email: '' }
  ]);

  const maskSIN = (sin: string) => {
    if (!sin || sin.length < 9) return 'XXX XXX XXX';
    return `XXX XX${sin.slice(-4)}`;
  };

  const displaySIN = showFullSIN ? employee.sin_encrypted : maskSIN(employee.sin_encrypted || '');
  const currentData = isEditing ? editData : employee;

  const handleAddressChange = (field: string, value: string) => {
    const address = currentData.address || {};
    onFieldChange('address', { ...address, [field]: value });
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: '', relationship: '', phone: '', email: '' }]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Name Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Name</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              {isEditing ? (
                <Input
                  value={currentData.first_name}
                  onChange={(e) => onFieldChange('first_name', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.first_name}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              {isEditing ? (
                <Input
                  value={currentData.last_name}
                  onChange={(e) => onFieldChange('last_name', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.last_name}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Preferred Name</Label>
              {isEditing ? (
                <Input
                  value={currentData.preferred_name || ''}
                  onChange={(e) => onFieldChange('preferred_name', e.target.value)}
                  placeholder="Optional"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.preferred_name || 'Not specified'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={currentData.email || ''}
                  onChange={(e) => onFieldChange('email', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.email || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              {isEditing ? (
                <Input
                  value={currentData.phone || ''}
                  onChange={(e) => onFieldChange('phone', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.phone || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Mobile Phone</Label>
              {isEditing ? (
                <Input
                  value={currentData.mobile_phone || ''}
                  onChange={(e) => onFieldChange('mobile_phone', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.mobile_phone || 'Not provided'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Work Phone</Label>
              {isEditing ? (
                <Input
                  value={currentData.work_phone || ''}
                  onChange={(e) => onFieldChange('work_phone', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.work_phone || 'Not provided'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h4 className="font-semibold">Home Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                {isEditing ? (
                  <Input
                    value={currentData.address?.street || ''}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">{employee.address?.street || 'Not provided'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                {isEditing ? (
                  <Input
                    value={currentData.address?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">{employee.address?.city || 'Not provided'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                {isEditing ? (
                  <Select 
                    value={currentData.province_code} 
                    onValueChange={(value) => onFieldChange('province_code', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="BC">British Columbia</SelectItem>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="QC">Quebec</SelectItem>
                      <SelectItem value="NS">Nova Scotia</SelectItem>
                      <SelectItem value="NB">New Brunswick</SelectItem>
                      <SelectItem value="MB">Manitoba</SelectItem>
                      <SelectItem value="SK">Saskatchewan</SelectItem>
                      <SelectItem value="PE">Prince Edward Island</SelectItem>
                      <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                      <SelectItem value="NT">Northwest Territories</SelectItem>
                      <SelectItem value="YT">Yukon</SelectItem>
                      <SelectItem value="NU">Nunavut</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">{employee.province_code}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                {isEditing ? (
                  <Input
                    value={currentData.address?.postal_code || ''}
                    onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">{employee.address?.postal_code || 'Not provided'}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.date_of_birth || ''}
                  onChange={(e) => onFieldChange('date_of_birth', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {currentData.date_of_birth ? format(new Date(currentData.date_of_birth), 'MMM dd, yyyy') : 'Not provided'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              {isEditing ? (
                <Select 
                  value={currentData.gender || ''} 
                  onValueChange={(value) => onFieldChange('gender', value)}
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
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.gender || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Social Insurance Number
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullSIN(!showFullSIN)}
                  className="h-6 w-6 p-0"
                >
                  {showFullSIN ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </Label>
              <div className="font-mono text-sm p-2 bg-muted rounded">
                {displaySIN}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Emergency Contacts
            {isEditing && (
              <Button size="sm" variant="outline" onClick={addEmergencyContact}>
                <Plus className="w-4 h-4 mr-1" />
                Add Contact
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Name</Label>
                  {isEditing ? (
                    <Input
                      value={contact.name}
                      onChange={(e) => {
                        const newContacts = [...emergencyContacts];
                        newContacts[index].name = e.target.value;
                        setEmergencyContacts(newContacts);
                      }}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">{contact.name || 'Not provided'}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  {isEditing ? (
                    <Input
                      value={contact.relationship}
                      onChange={(e) => {
                        const newContacts = [...emergencyContacts];
                        newContacts[index].relationship = e.target.value;
                        setEmergencyContacts(newContacts);
                      }}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">{contact.relationship || 'Not provided'}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  {isEditing ? (
                    <Input
                      value={contact.phone}
                      onChange={(e) => {
                        const newContacts = [...emergencyContacts];
                        newContacts[index].phone = e.target.value;
                        setEmergencyContacts(newContacts);
                      }}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">{contact.phone || 'Not provided'}</div>
                  )}
                </div>
                <div className="space-y-2 flex items-end">
                  {isEditing && emergencyContacts.length > 1 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => removeEmergencyContact(index)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}