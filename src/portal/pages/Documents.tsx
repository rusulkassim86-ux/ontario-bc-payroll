import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, Download, Eye, Search, Calendar } from 'lucide-react';

export function Documents() {
  // Mock documents data
  const documents = [
    {
      id: '1',
      type: 'T4',
      name: 'T4 - 2023 Tax Year',
      year: 2023,
      size: '245 KB',
      uploadDate: '2024-02-28',
      category: 'Tax Documents'
    },
    {
      id: '2',
      type: 'ROE',
      name: 'Record of Employment',
      year: 2023,
      size: '156 KB',
      uploadDate: '2023-12-15',
      category: 'Employment Records'
    },
    {
      id: '3',
      type: 'Policy',
      name: 'Employee Handbook 2024',
      year: 2024,
      size: '2.1 MB',
      uploadDate: '2024-01-15',
      category: 'Company Policies'
    },
    {
      id: '4',
      type: 'Policy',
      name: 'Safety Manual',
      year: 2024,
      size: '1.8 MB',
      uploadDate: '2024-01-15',
      category: 'Company Policies'
    },
    {
      id: '5',
      type: 'Benefits',
      name: 'Benefits Summary 2024',
      year: 2024,
      size: '890 KB',
      uploadDate: '2024-01-01',
      category: 'Benefits'
    }
  ];

  const getDocumentIcon = (type: string) => {
    return <FileText className="h-5 w-5 text-primary" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'T4':
        return 'default';
      case 'ROE':
        return 'secondary';
      case 'Policy':
        return 'outline';
      case 'Benefits':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Access your tax forms, employment records, and company documents
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="portal-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search documents..." 
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Filter by Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Categories */}
      <div className="grid gap-6">
        {/* Tax Documents */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle>Tax Documents</CardTitle>
            <CardDescription>T4 slips and other tax-related documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.filter(doc => doc.category === 'Tax Documents').map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.size} • Uploaded {new Date(doc.uploadDate).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeColor(doc.type) as any}>
                      {doc.type}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employment Records */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle>Employment Records</CardTitle>
            <CardDescription>Records of employment and other HR documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.filter(doc => doc.category === 'Employment Records').map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.size} • Uploaded {new Date(doc.uploadDate).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeColor(doc.type) as any}>
                      {doc.type}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Company Documents */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle>Company Documents</CardTitle>
            <CardDescription>Policies, handbooks, and company information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.filter(doc => doc.category === 'Company Policies' || doc.category === 'Benefits').map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.size} • Uploaded {new Date(doc.uploadDate).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeColor(doc.type) as any}>
                      {doc.category === 'Benefits' ? 'Benefits' : 'Policy'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Request */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Need a Document?</CardTitle>
          <CardDescription>Request additional documents or copies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                Can't find what you're looking for? Contact HR to request additional documents 
                or updated copies of existing documents.
              </p>
            </div>
            <Button variant="outline">
              Contact HR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}