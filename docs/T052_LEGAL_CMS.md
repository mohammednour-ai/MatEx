# T052: Legal CMS (Terms/Privacy)

## Overview
Implement a Content Management System for legal pages (Terms of Service, Privacy Policy, Refund Policy) with markdown editing, version control, and automatic re-consent enforcement when versions change.

## Requirements
- Markdown editor for legal documents
- Version control with publish/draft states
- Automatic re-consent enforcement on version changes
- Preview functionality
- Document history and rollback
- SEO-friendly URLs
- Canadian legal compliance (PIPEDA, Consumer Protection Act)

## Database Schema

### legal_documents Table
```sql
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('terms', 'privacy', 'refund')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly identifier
  content_md TEXT NOT NULL, -- Markdown content
  version TEXT NOT NULL, -- Semantic version (e.g., "1.0.0", "1.1.0")
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  effective_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(type, version),
  UNIQUE(type, slug)
);

-- Add indexes
CREATE INDEX idx_legal_documents_type ON legal_documents(type);
CREATE INDEX idx_legal_documents_status ON legal_documents(status);
CREATE INDEX idx_legal_documents_effective_date ON legal_documents(effective_date);
```

### legal_document_versions Table (for history)
```sql
CREATE TABLE legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  change_summary TEXT -- Summary of changes made
);
```

### Update app_settings for current versions
```sql
-- Add to existing app_settings seeding
INSERT INTO app_settings (key, value) VALUES
('legal.terms_version', '"1.0.0"'),
('legal.privacy_version', '"1.0.0"'),
('legal.refund_version', '"1.0.0"'),
('legal.force_reaccept', 'false');
```

## API Routes

### GET /api/admin/legal
```typescript
// src/app/api/admin/legal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  let query = supabase
    .from('legal_documents')
    .select(`
      *,
      created_by_profile:profiles!legal_documents_created_by_fkey(full_name),
      updated_by_profile:profiles!legal_documents_updated_by_fkey(full_name)
    `)
    .order('type')
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: documents, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { type, title, slug, content_md, version, status, effective_date } = body;

  // Validate required fields
  if (!type || !title || !slug || !content_md || !version) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Validate type
  if (!['terms', 'privacy', 'refund'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid document type' },
      { status: 400 }
    );
  }

  // Validate version format (semantic versioning)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    return NextResponse.json(
      { error: 'Version must follow semantic versioning (e.g., 1.0.0)' },
      { status: 400 }
    );
  }

  const { data: document, error } = await supabase
    .from('legal_documents')
    .insert({
      type,
      title,
      slug,
      content_md,
      version,
      status: status || 'draft',
      effective_date: effective_date ? new Date(effective_date).toISOString() : null,
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document }, { status: 201 });
}
```

### PUT /api/admin/legal/[id]
```typescript
// src/app/api/admin/legal/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { title, slug, content_md, version, status, effective_date, change_summary } = body;

  // Get current document for versioning
  const { data: currentDoc } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!currentDoc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Create version backup if content changed
  if (currentDoc.content_md !== content_md || currentDoc.version !== version) {
    await supabase.from('legal_document_versions').insert({
      document_id: params.id,
      version: currentDoc.version,
      title: currentDoc.title,
      content_md: currentDoc.content_md,
      status: currentDoc.status,
      effective_date: currentDoc.effective_date,
      created_by: user.id,
      change_summary
    });
  }

  // Update document
  const { data: document, error } = await supabase
    .from('legal_documents')
    .update({
      title,
      slug,
      content_md,
      version,
      status,
      effective_date: effective_date ? new Date(effective_date).toISOString() : null,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('legal_documents')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### POST /api/admin/legal/[id]/publish
```typescript
// src/app/api/admin/legal/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  
  // Verify admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { effective_date } = body;

  // Get document
  const { data: document } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Update document status to published
  const { data: updatedDoc, error: updateError } = await supabase
    .from('legal_documents')
    .update({
      status: 'published',
      effective_date: effective_date ? new Date(effective_date).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Update app_settings with new version
  const settingKey = `legal.${document.type}_version`;
  await supabase
    .from('app_settings')
    .upsert({
      key: settingKey,
      value: JSON.stringify(document.version),
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

  // Set flag to force re-acceptance
  await supabase
    .from('app_settings')
    .upsert({
      key: 'legal.force_reaccept',
      value: 'true',
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

  return NextResponse.json({ document: updatedDoc });
}
```

### GET /api/legal/[type]
```typescript
// src/app/api/legal/[type]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { renderMarkdown } from '@/lib/markdown-renderer';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const supabase = createServerClient();

  // Validate type
  if (!['terms', 'privacy', 'refund'].includes(params.type)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }

  // Get published document
  const { data: document, error } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('type', params.type)
    .eq('status', 'published')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Render markdown to HTML
  const html_content = renderMarkdown(document.content_md);

  return NextResponse.json({
    document: {
      ...document,
      html_content
    }
  });
}
```

## React Components

### LegalDocumentEditor Component
```typescript
// src/components/admin/LegalDocumentEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface LegalDocument {
  id?: string;
  type: 'terms' | 'privacy' | 'refund';
  title: string;
  slug: string;
  content_md: string;
  version: string;
  status: 'draft' | 'published';
  effective_date?: string;
}

interface LegalDocumentEditorProps {
  document?: LegalDocument;
  onSave: (document: LegalDocument) => Promise<void>;
  onPublish?: (document: LegalDocument, effectiveDate: Date) => Promise<void>;
  onCancel: () => void;
}

export default function LegalDocumentEditor({ 
  document, 
  onSave, 
  onPublish, 
  onCancel 
}: LegalDocumentEditorProps) {
  const [formData, setFormData] = useState<LegalDocument>({
    type: 'terms',
    title: '',
    slug: '',
    content_md: '',
    version: '1.0.0',
    status: 'draft',
    ...document
  });

  const [preview, setPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [publishDate, setPublishDate] = useState<Date>(new Date());
  const [changeSummary, setChangeSummary] = useState('');

  // Auto-generate slug from title
  useEffect(() => {
    if (!document && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.title, document]);

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/admin/legal/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_md: formData.content_md })
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.html_content);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({ ...formData, change_summary: changeSummary });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!onPublish) return;
    
    setIsLoading(true);
    try {
      await onPublish(formData, publishDate);
    } finally {
      setIsLoading(false);
    }
  };

  const documentTypes = [
    { value: 'terms', label: 'Terms of Service' },
    { value: 'privacy', label: 'Privacy Policy' },
    { value: 'refund', label: 'Refund Policy' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {document ? 'Edit Legal Document' : 'Create Legal Document'}
          </h1>
          {document && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={document.status === 'published' ? 'default' : 'secondary'}>
                {document.status}
              </Badge>
              <span className="text-sm text-gray-500">v{document.version}</span>
            </div>
          )}
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Draft'}
          </Button>
          {onPublish && (
            <Popover>
              <PopoverTrigger asChild>
                <Button disabled={isLoading}>
                  Publish
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Publish Document</h4>
                    <p className="text-sm text-gray-600">
                      This will make the document live and may require users to re-accept terms.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Effective Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(publishDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={publishDate}
                          onSelect={(date) => date && setPublishDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={handlePublish} className="w-full">
                    Publish Now
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type</label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'terms' | 'privacy' | 'refund') =>
                      setFormData({ ...formData, type: value })
                    }
                    disabled={!!document}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Version</label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0.0"
                    pattern="^\d+\.\d+\.\d+$"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="url-friendly-slug"
                />
              </div>

              {document && (
                <div>
                  <label className="block text-sm font-medium mb-1">Change Summary</label>
                  <Input
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Brief description of changes made"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
                <Textarea
                  value={formData.content_md}
                  onChange={(e) => setFormData({ ...formData, content_md: e.target.value })}
                  placeholder="Document content in Markdown format"
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={handlePreview} variant="outline" className="w-full">
                Generate Preview
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Help */}
        <div className="space-y-6">
          {/* Markdown Help */}
          <Card>
            <CardHeader>
              <CardTitle>Markdown Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><code># Heading 1</code></div>
              <div><code>## Heading 2</code></div>
              <div><code>**Bold text**</code></div>
              <div><code>*Italic text*</code></div>
              <div><code>[Link](url)</code></div>
              <div><code>- List item</code></div>
              <div><code>1. Numbered item</code></div>
              <div><code>`Code`</code></div>
              <div><code>&gt; Quote</code></div>
            </CardContent>
          </Card>

          {/* Preview */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="rendered">
                  <TabsList>
                    <TabsTrigger value="rendered">Rendered</TabsTrigger>
                    <TabsTrigger value="html">HTML Source</TabsTrigger>
                  </TabsList>
                  <TabsContent value="rendered" className="mt-4">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview }} 
                    />
                  </TabsContent>
                  <TabsContent value="html" className="mt-4">
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                      {preview}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

### LegalDocumentsList Component
```typescript
// src/components/admin/LegalDocumentsList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LegalDocumentEditor from './LegalDocumentEditor';

interface LegalDocument {
  id: string;
  type: 'terms' | 'privacy' | 'refund';
  title: string;
  slug: string;
  content_md: string;
  version: string;
  status: 'draft' | 'published';
  effective_date?: string;
  created_at: string;
  updated_at: string;
  created_by_profile?: { full_name: string };
  updated_by_profile?: { full_name: string };
}

export default function LegalDocumentsList() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, typeFilter, statusFilter]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/admin/legal');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.version.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    setFilteredDocuments(filtered);
  };

  const handleSaveDocument = async (documentData: LegalDocument) => {
    try {
      const url = documentData.id
        ? `/api/admin/legal/${documentData.id}`
        : '/api/admin/legal';
      
      const method = documentData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });

      if (response.ok) {
        await fetchDocuments();
        setShowEditor(false);
        setEditingDocument(null);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  };

  const handlePublishDocument = async (documentData: LegalDocument, effectiveDate: Date) => {
    try {
      const response = await fetch(`/api/admin/legal/${documentData.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ effective_date: effectiveDate.toISOString() })
      });

      if (response.ok) {
        await fetchDocuments();
        setShowEditor(false);
        setEditingDocument(null);
      }
    } catch (error) {
      console.error('Failed to publish document:', error);
    }
  };

  const handleDeleteDocument = async (document: LegalDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/legal/${document.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (showEditor) {
    return (
      <LegalDocumentEditor
        document={editingDocument}
        onSave={handleSaveDocument}
        onPublish={editingDocument ? handlePublishDocument : undefined}
        onCancel={() => {
          setShowEditor(false);
          setEditingDocument(null);
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Legal Documents</h1>
        <Button
          onClick={() => {
            setEditingDocument(null);
            setShowEditor(true);
          }}
        >
          Create Document
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="terms">Terms of Service</SelectItem>
                <SelectItem value="privacy">Privacy Policy</SelectItem>
                <SelectItem value="refund">Refund Policy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-8">Loading documents...</div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((document) => (
            <Card key={document.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{document.title}</h3>
                      <Badge variant={document.status === 'published' ? 'default' : 'secondary'}>
                        {document.status}
                      </Badge>
                      <Badge variant="outline">
                        {document.type}
                      </Badge>
                      <span className="text-sm text-gray-500">v{document.version}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <code className="bg-gray-100 px-1 rounded">{document.slug}</code>
                    </p>
                    {document.effective_date && (
                      <p className="text-sm text-gray-600 mb-2">
                        Effective: {new Date(document.effective_date).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Updated {new Date(document.updated_at).toLocaleDateString()} by{' '}
                      {document.updated_by_profile?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingDocument(document);
                        setShowEditor(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(document)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No documents found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Public Legal Pages

### Legal Page Component
```typescript
// src/app/legal/[type]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface LegalPageProps {
  params: { type: string };
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const typeLabels = {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    refund: 'Refund Policy'
  };

  const title = typeLabels[params.type as keyof typeof typeLabels];
  
  if (!title) {
    return { title: 'Legal Document Not Found' };
  }

  return {
    title: `${title} - MatEx`,
    description: `${title} for MatEx marketplace platform`
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  if (!['terms', 'privacy', 'refund'].includes(params.type)) {
    notFound();
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/legal/${params.type}`, {
      cache: 'no-store' // Always fetch latest version
    });

    if (!response.ok) {
      notFound();
    }

    const { document } = await response.json();

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Version {document.version}</span>
            {document.effective_date && (
              <span>
                Effective: {new Date(document.effective_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: document.html_content }}
        />

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Last updated: {new Date(document.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
```

## Markdown Renderer Utility

### Markdown Renderer
```typescript
// src/lib/markdown-renderer.ts
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false
});

// Custom renderer for legal documents
const renderer = new marked.Renderer();

// Add custom heading renderer with anchor links
renderer.heading = function(text, level) {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `
    <h${level} id="${escapedText}" class="group">
      <a href="#${escapedText}" class="anchor-link opacity-0 group-hover:opacity-100 transition-opacity">
        ${text}
      </a>
    </h${level}>
  `;
};

// Add custom link renderer for external links
renderer.link = function(href, title, text) {
  const isExternal = href && (href.startsWith('http') || href.startsWith('mailto:'));
  const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
  const titleAttr = title ? ` title="${title}"` : '';
  
  return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
};

marked.use({ renderer });

export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  try {
    // Convert markdown to HTML
    const html = marked(markdown);
    
    // Sanitize HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's',
        'ul', 'ol', 'li',
        'a', 'img',
        'blockquote', 'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'alt', 'src',
        'id', 'class',
        'target', 'rel'
      ]
    });
    
    return sanitizedHtml;
  } catch (error) {
    console.error('Markdown rendering failed:', error);
    return '<p>Error rendering content</p>';
  }
}
```

## Admin Page Integration

### Admin Legal Page
```typescript
// src/app/admin/legal/page.tsx
import { Metadata } from 'next';
import LegalDocumentsList from '@/components/admin/LegalDocumentsList';

export const metadata: Metadata = {
  title: 'Legal Documents - MatEx Admin',
  description: 'Manage legal documents and policies'
};

export default function AdminLegalPage() {
  return <LegalDocumentsList />;
}
```

## Terms Consent Integration

### Update Terms Consent Helper
```typescript
// src/lib/terms.ts - Update existing file
import { createServerClient } from '@/lib/supabaseServer';

export async function getCurrentTermsVersions() {
  const supabase = createServerClient();
  
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['legal.terms_version', 'legal.privacy_version', 'legal.refund_version'])
    .order('key');

  const versions = {};
  settings?.forEach(setting => {
    const type = setting.key.replace('legal.', '').replace('_version', '');
    versions[type] = JSON.parse(setting.value);
  });

  return versions;
}

export async function checkUserConsent(userId: string) {
  const supabase = createServerClient();
  const currentVersions = await getCurrentTermsVersions();
  
  const { data: acceptances } = await supabase
    .from('terms_acceptances')
    .select('terms_version')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false });

  const latestAcceptance = acceptances?.[0];
  
  // Check if user needs to re-accept terms
  const needsReaccept = !latestAcceptance || 
    latestAcceptance.terms_version !== currentVersions.terms;

  return {
    hasAccepted: !!latestAcceptance,
    needsReaccept,
    currentVersion: currentVersions.terms,
    acceptedVersion: latestAcceptance?.terms_version
  };
}

export async function recordTermsAcceptance(userId: string, version: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('terms_acceptances')
    .insert({
      user_id: userId,
      terms_version: version,
      accepted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record terms acceptance: ${error.message}`);
  }

  return data;
}
```

## Default Legal Content

### Seed Legal Documents Script
```javascript
// scripts/seed-legal-documents.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const defaultDocuments = [
  {
    type: 'terms',
    title: 'Terms of Service',
    slug: 'terms-of-service',
    version: '1.0.0',
    status: 'published',
    content_md: `# Terms of Service

## 1. Acceptance of Terms

By accessing and using MatEx ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.

## 2. Description of Service

MatEx is an online marketplace platform that facilitates the buying and selling of waste and scrap materials in Canada through auction and fixed-price listings.

## 3. User Accounts

### 3.1 Registration
- Users must provide accurate and complete information
- Users are responsible for maintaining account security
- One account per person or business entity

### 3.2 Account Types
- **Buyers**: Can browse, bid on, and purchase materials
- **Sellers**: Can list materials for sale via auction or fixed price
- **Both**: Can act as both buyer and seller

## 4. Auctions and Bidding

### 4.1 Auction Rules
- All bids are binding commitments to purchase
- Auctions may have soft-close extensions
- Deposits may be required for bidding

### 4.2 Winning Bids
- Highest bidder at auction close wins the item
- Payment must be completed within 48 hours
- Failure to pay may result in account suspension

## 5. Payments and Fees

### 5.1 Transaction Fees
- Platform charges a transaction fee on completed sales
- Fees are clearly disclosed before listing

### 5.2 Payment Processing
- Payments processed through Stripe
- Deposits may be required and held until transaction completion

## 6. Inspections

- Buyers may request inspections before bidding
- Sellers must accommodate reasonable inspection requests
- Inspection appointments are binding

## 7. Prohibited Activities

- Fraudulent or misleading listings
- Bid manipulation or shill bidding
- Harassment of other users
- Violation of applicable laws

## 8. Limitation of Liability

MatEx acts as a marketplace facilitator and is not responsible for the quality, safety, or legality of items listed, the truth or accuracy of listings, or the ability of sellers to sell or buyers to pay.

## 9. Governing Law

These terms are governed by the laws of Canada and the province where the transaction occurs.

## 10. Contact Information

For questions about these terms, contact us at legal@matex.ca

*Last updated: [Current Date]*`
  },
  {
    type: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    version: '1.0.0',
    status: 'published',
    content_md: `# Privacy Policy

## 1. Introduction

MatEx ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.

## 2. Information We Collect

### 2.1 Personal Information
- Name and contact information
- Business information (for commercial accounts)
- Payment information (processed by Stripe)
- Government-issued ID for KYC verification

### 2.2 Usage Information
- Browsing activity on the platform
- Bid history and transaction records
- Communication with other users

### 2.3 Technical Information
- IP address and device information
- Browser type and version
- Cookies and similar technologies

## 3. How We Use Your Information

### 3.1 Platform Operations
- Facilitate transactions between buyers and sellers
- Process payments and manage accounts
- Verify user identity (KYC compliance)

### 3.2 Communication
- Send transaction-related notifications
- Provide customer support
- Send marketing communications (with consent)

### 3.3 Legal Compliance
- Comply with applicable laws and regulations
- Prevent fraud and ensure platform security
- Respond to legal requests

## 4. Information Sharing

### 4.1 With Other Users
- Basic profile information visible to other users
- Transaction history for completed deals
- Communication through platform messaging

### 4.2 With Service Providers
- Payment processing (Stripe)
- Email delivery services
- Analytics and monitoring tools

### 4.3 Legal Requirements
- Law enforcement requests
- Court orders and legal proceedings
- Regulatory compliance

## 5. Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## 6. Data Retention

We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Transaction records are retained for 7 years as required by Canadian law.

## 7. Your Rights

Under PIPEDA and applicable provincial privacy laws, you have the right to:
- Access your personal information
- Request correction of inaccurate information
- Request deletion of your information (subject to legal requirements)
- Withdraw consent for marketing communications

## 8. Cookies

We use cookies to enhance your experience on our platform. You can control cookie settings through your browser preferences.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our platform.

## 10. Contact Us

For privacy-related questions or requests, contact our Privacy Officer at privacy@matex.ca

*Last updated: [Current Date]*`
  },
  {
    type: 'refund',
    title: 'Refund Policy',
    slug: 'refund-policy',
    version: '1.0.0',
    status: 'published',
    content_md: `# Refund Policy

## 1. Overview

This Refund Policy outlines the circumstances under which refunds may be issued on the MatEx platform.

## 2. Transaction Fees

### 2.1 Non-Refundable Fees
- Platform transaction fees are generally non-refundable
- Payment processing fees are non-refundable

### 2.2 Exceptional Circumstances
Fees may be refunded in cases of:
- Platform technical errors
- Fraudulent activity
- Violation of terms by other party

## 3. Auction Deposits

### 3.1 Winning Bidders
- Deposits are applied to final payment
- No refund if payment is completed

### 3.2 Non-Winning Bidders
- Deposits are automatically refunded
- Refunds processed within 5-7 business days

### 3.3 Failed Payment
- Deposits may be forfeited if winner fails to pay
- Seller compensation may be deducted

## 4. Purchase Refunds

### 4.1 Material Condition
- Refunds available if materials significantly differ from description
- Buyer must provide evidence within 48 hours of inspection
- Return shipping costs may apply

### 4.2 Seller Misrepresentation
- Full refund if seller materially misrepresented items
- Platform investigation required
- Seller may be suspended

## 5. Inspection-Related Refunds

### 5.1 Seller No-Show
- Full refund if seller fails to provide agreed inspection
- Compensation for buyer's travel costs may apply

### 5.2 Safety Concerns
- Refund available if materials pose undisclosed safety risks
- Professional assessment may be required

## 6. Refund Process

### 6.1 Request Procedure
1. Contact customer support within 48 hours
2. Provide detailed explanation and evidence
3. Allow 3-5 business days for investigation
4. Refund processed if approved

### 6.2 Processing Time
- Credit card refunds: 5-10 business days
- Bank transfer refunds: 3-7 business days
- Deposit refunds: 5-7 business days

## 7. Dispute Resolution

### 7.1 Platform Mediation
- MatEx may mediate disputes between parties
- Binding arbitration may be required
- Legal action as last resort

### 7.2 Consumer Protection
- Rights under provincial consumer protection laws preserved
- Contact provincial consumer affairs if needed

## 8. Exceptions

No refunds available for:
- Change of mind after successful bid
- Market price fluctuations
- Buyer's failure to inspect when opportunity provided
- Normal wear and tear of materials

## 9. Contact Information

For refund requests or questions, contact support@matex.ca

*Last updated: [Current Date]*`
  }
];

async function seedLegalDocuments() {
  console.log('Seeding legal documents...');

  for (const doc of defaultDocuments) {
    const { data, error } = await supabase
      .from('legal_documents')
      .upsert(doc, { onConflict: 'type,version' });

    if (error) {
      console.error(`Error seeding ${doc.type} document:`, error);
    } else {
      console.log(`✓ Seeded legal document: ${doc.type}`);
    }
  }

  console.log('Legal document seeding complete!');
}

seedLegalDocuments().catch(console.error);
```

## Security Considerations

1. **Admin-only Access**: All CMS endpoints require admin role verification
2. **Input Validation**: Validate document types, versions, and content
3. **XSS Prevention**: Sanitize HTML output with DOMPurify
4. **Version Control**: Maintain complete history of document changes
5. **Content Security**: Validate markdown content before rendering

## Performance Optimizations

1. **Document Caching**: Cache published documents for faster loading
2. **Lazy Loading**: Load editor components on demand
3. **Search Indexing**: Index document content for search functionality
4. **CDN Delivery**: Serve static legal pages via CDN

This implementation provides a comprehensive legal CMS with version control, automatic re-consent enforcement, and Canadian legal compliance features.
