# T051: Notification Templates CMS

## Overview
Implement a comprehensive Content Management System (CMS) for notification templates, allowing administrators to create, edit, and manage notification templates with preview functionality and variable documentation.

## Requirements
- CRUD operations for notification templates
- Template preview with sample data
- Variable documentation and validation
- Simple versioning system
- Template activation/deactivation
- Multi-channel support (in-app, email, SMS)

## Database Schema

### notification_templates Table
```sql
-- Already exists from T012, but ensure these fields:
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'bid_placed', 'auction_won'
  name TEXT NOT NULL, -- Human-readable name
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('inapp', 'email', 'sms')),
  subject TEXT, -- For email templates
  body_md TEXT NOT NULL, -- Markdown template with variables
  variables JSONB DEFAULT '[]'::jsonb, -- Available variables
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Add indexes
CREATE INDEX idx_notification_templates_code ON notification_templates(code);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);
```

### template_versions Table (for versioning)
```sql
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject TEXT,
  body_md TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(template_id, version)
);
```

## API Routes

### GET /api/admin/templates
```typescript
// src/app/api/admin/templates/route.ts
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
  const channel = searchParams.get('channel');
  const active = searchParams.get('active');

  let query = supabase
    .from('notification_templates')
    .select(`
      *,
      updated_by_profile:profiles!notification_templates_updated_by_fkey(full_name)
    `)
    .order('code');

  if (channel) {
    query = query.eq('channel', channel);
  }

  if (active !== null) {
    query = query.eq('is_active', active === 'true');
  }

  const { data: templates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates });
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
  const { code, name, description, channel, subject, body_md, variables } = body;

  // Validate required fields
  if (!code || !name || !channel || !body_md) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Validate channel
  if (!['inapp', 'email', 'sms'].includes(channel)) {
    return NextResponse.json(
      { error: 'Invalid channel' },
      { status: 400 }
    );
  }

  // Email templates require subject
  if (channel === 'email' && !subject) {
    return NextResponse.json(
      { error: 'Email templates require a subject' },
      { status: 400 }
    );
  }

  const { data: template, error } = await supabase
    .from('notification_templates')
    .insert({
      code,
      name,
      description,
      channel,
      subject,
      body_md,
      variables: variables || [],
      updated_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
```

### PUT /api/admin/templates/[id]
```typescript
// src/app/api/admin/templates/[id]/route.ts
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
  const { name, description, subject, body_md, variables, is_active } = body;

  // Get current template for versioning
  const { data: currentTemplate } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!currentTemplate) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Create version backup if content changed
  if (currentTemplate.body_md !== body_md || currentTemplate.subject !== subject) {
    await supabase.from('template_versions').insert({
      template_id: params.id,
      version: currentTemplate.version,
      subject: currentTemplate.subject,
      body_md: currentTemplate.body_md,
      variables: currentTemplate.variables,
      created_by: user.id
    });
  }

  // Update template
  const { data: template, error } = await supabase
    .from('notification_templates')
    .update({
      name,
      description,
      subject,
      body_md,
      variables: variables || [],
      is_active,
      version: currentTemplate.body_md !== body_md || currentTemplate.subject !== subject 
        ? currentTemplate.version + 1 
        : currentTemplate.version,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template });
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
    .from('notification_templates')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### POST /api/admin/templates/[id]/preview
```typescript
// src/app/api/admin/templates/[id]/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { renderTemplate } from '@/lib/email-renderer';

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
  const { subject, body_md, variables, sample_data } = body;

  try {
    // Use sample data or default values
    const data = sample_data || {
      user_name: 'John Doe',
      listing_title: 'Sample Steel Beams',
      bid_amount: '$1,250.00',
      auction_end_time: '2024-01-15 3:00 PM EST',
      inspection_date: '2024-01-12 10:00 AM',
      deposit_amount: '$125.00'
    };

    const renderedSubject = subject ? renderTemplate(subject, data) : null;
    const renderedBody = renderTemplate(body_md, data);

    return NextResponse.json({
      subject: renderedSubject,
      body_html: renderedBody,
      variables_used: extractVariables(body_md),
      sample_data: data
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Template rendering failed: ' + error.message },
      { status: 400 }
    );
  }
}

function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map(match => match.replace(/[{}]/g, '').trim());
}
```

## React Components

### TemplateEditor Component
```typescript
// src/components/admin/TemplateEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Template {
  id?: string;
  code: string;
  name: string;
  description?: string;
  channel: 'inapp' | 'email' | 'sms';
  subject?: string;
  body_md: string;
  variables: string[];
  is_active: boolean;
}

interface TemplateEditorProps {
  template?: Template;
  onSave: (template: Template) => Promise<void>;
  onCancel: () => void;
}

export default function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [formData, setFormData] = useState<Template>({
    code: '',
    name: '',
    description: '',
    channel: 'email',
    subject: '',
    body_md: '',
    variables: [],
    is_active: true,
    ...template
  });

  const [preview, setPreview] = useState<{
    subject?: string;
    body_html: string;
    variables_used: string[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/admin/templates/${template?.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          body_md: formData.body_md,
          variables: formData.variables
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const availableVariables = [
    'user_name', 'user_email', 'listing_title', 'listing_id',
    'bid_amount', 'auction_end_time', 'inspection_date',
    'deposit_amount', 'seller_name', 'buyer_name'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {template ? 'Edit Template' : 'Create Template'}
        </h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Template Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., bid_placed"
                  disabled={!!template}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Channel</label>
                <Select
                  value={formData.channel}
                  onValueChange={(value: 'inapp' | 'email' | 'sms') =>
                    setFormData({ ...formData, channel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inapp">In-App</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Human-readable name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            {formData.channel === 'email' && (
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject with {{variables}}"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Body (Markdown)</label>
              <Textarea
                value={formData.body_md}
                onChange={(e) => setFormData({ ...formData, body_md: e.target.value })}
                placeholder="Template body with {{variables}}"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <label className="text-sm font-medium">Active</label>
            </div>

            <Button onClick={handlePreview} disabled={previewLoading} className="w-full">
              {previewLoading ? 'Generating Preview...' : 'Preview Template'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview & Variables */}
        <div className="space-y-6">
          {/* Available Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Available Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {availableVariables.map((variable) => (
                  <code
                    key={variable}
                    className="bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (textarea) {
                        const cursorPos = textarea.selectionStart;
                        const textBefore = formData.body_md.substring(0, cursorPos);
                        const textAfter = formData.body_md.substring(cursorPos);
                        const newText = textBefore + `{{${variable}}}` + textAfter;
                        setFormData({ ...formData, body_md: newText });
                      }
                    }}
                  >
                    {`{{${variable}}}`}
                  </code>
                ))}
          
          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No templates found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Admin Page Integration

### Admin Templates Page
```typescript
// src/app/admin/templates/page.tsx
import { Metadata } from 'next';
import TemplatesList from '@/components/admin/TemplatesList';

export const metadata: Metadata = {
  title: 'Notification Templates - MatEx Admin',
  description: 'Manage notification templates'
};

export default function AdminTemplatesPage() {
  return <TemplatesList />;
}
```

## Template Seeding

### Default Templates Script
```javascript
// scripts/seed-notification-templates.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const defaultTemplates = [
  {
    code: 'bid_placed',
    name: 'Bid Placed Confirmation',
    description: 'Sent when a user places a bid',
    channel: 'email',
    subject: 'Bid Placed: {{listing_title}}',
    body_md: `# Bid Confirmation

Hello {{user_name}},

Your bid of **{{bid_amount}}** has been placed on:

**{{listing_title}}**

The auction ends on {{auction_end_time}}.

Good luck!

---
MatEx Team`
  },
  {
    code: 'outbid_notification',
    name: 'Outbid Notification',
    description: 'Sent when a user is outbid',
    channel: 'email',
    subject: 'You\'ve been outbid on {{listing_title}}',
    body_md: `# You've Been Outbid

Hello {{user_name}},

Unfortunately, you've been outbid on:

**{{listing_title}}**

Current highest bid: **{{current_bid_amount}}**

The auction ends on {{auction_end_time}}. You can still place a higher bid!

[View Auction]({{listing_url}})

---
MatEx Team`
  },
  {
    code: 'auction_won',
    name: 'Auction Won',
    description: 'Sent when a user wins an auction',
    channel: 'email',
    subject: 'Congratulations! You won {{listing_title}}',
    body_md: `# Congratulations!

Hello {{user_name}},

You've won the auction for:

**{{listing_title}}**

Winning bid: **{{winning_bid_amount}}**

Next steps:
1. Complete payment within 48 hours
2. Arrange pickup/delivery with the seller

[Complete Payment]({{payment_url}})

---
MatEx Team`
  },
  {
    code: 'inspection_booked',
    name: 'Inspection Booked',
    description: 'Sent when an inspection is booked',
    channel: 'email',
    subject: 'Inspection Booked: {{listing_title}}',
    body_md: `# Inspection Confirmed

Hello {{user_name}},

Your inspection has been booked for:

**{{listing_title}}**

**Date & Time:** {{inspection_date}}
**Location:** {{inspection_location}}

Please arrive on time. Contact the seller if you need to reschedule.

---
MatEx Team`
  },
  {
    code: 'deposit_authorized',
    name: 'Deposit Authorized',
    description: 'Sent when a deposit is authorized',
    channel: 'email',
    subject: 'Deposit Authorized: {{listing_title}}',
    body_md: `# Deposit Authorized

Hello {{user_name}},

Your deposit of **{{deposit_amount}}** has been authorized for:

**{{listing_title}}**

You can now place bids on this auction. The deposit will be:
- Applied to your final payment if you win
- Released if you don't win

Good luck with your bidding!

---
MatEx Team`
  }
];

async function seedTemplates() {
  console.log('Seeding notification templates...');

  for (const template of defaultTemplates) {
    const { data, error } = await supabase
      .from('notification_templates')
      .upsert(template, { onConflict: 'code' });

    if (error) {
      console.error(`Error seeding template ${template.code}:`, error);
    } else {
      console.log(`✓ Seeded template: ${template.code}`);
    }
  }

  console.log('Template seeding complete!');
}

seedTemplates().catch(console.error);
```

## Integration Points

### Update Email Renderer
The email renderer from T044 should be updated to work with the CMS templates:

```typescript
// Update to src/lib/email-renderer.ts
export async function getTemplate(code: string, channel: 'email' | 'inapp' | 'sms') {
  const supabase = createServerClient();
  
  const { data: template, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('code', code)
    .eq('channel', channel)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    throw new Error(`Template not found: ${code} (${channel})`);
  }

  return template;
}

export async function renderNotificationTemplate(
  code: string,
  channel: 'email' | 'inapp' | 'sms',
  data: Record<string, any>
) {
  const template = await getTemplate(code, channel);
  
  const renderedSubject = template.subject ? renderTemplate(template.subject, data) : null;
  const renderedBody = renderTemplate(template.body_md, data);

  return {
    subject: renderedSubject,
    body_html: renderedBody,
    body_md: template.body_md
  };
}
```

## Testing

### Template Management Tests
```typescript
// tests/admin/templates.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '../utils/mock-supabase';

describe('Template Management', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  it('should create a new template', async () => {
    const templateData = {
      code: 'test_template',
      name: 'Test Template',
      channel: 'email',
      subject: 'Test Subject',
      body_md: 'Hello {{user_name}}!'
    };

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: '123', ...templateData },
            error: null
          })
        })
      })
    });

    // Test template creation logic
  });

  it('should validate required fields', async () => {
    const invalidTemplate = {
      name: 'Test Template'
      // Missing required fields
    };

    // Test validation logic
  });

  it('should create template versions on update', async () => {
    // Test versioning logic
  });
});
```

## Security Considerations

1. **Admin-only Access**: All template management endpoints require admin role
2. **Input Validation**: Validate template codes, channels, and content
3. **XSS Prevention**: Sanitize template content when rendering
4. **Version Control**: Maintain template history for audit purposes
5. **Template Validation**: Ensure templates compile without errors

## Performance Optimizations

1. **Template Caching**: Cache active templates in memory
2. **Lazy Loading**: Load template editor components on demand
3. **Pagination**: Implement pagination for large template lists
4. **Search Indexing**: Index template names and codes for fast search

This implementation provides a comprehensive CMS for notification templates with preview functionality, versioning, and multi-channel support.
              </div>
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
                    {preview.subject && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm text-gray-600 mb-1">Subject:</h4>
                        <p className="font-medium">{preview.subject}</p>
                      </div>
                    )}
                    <div className="border rounded p-4 bg-white">
                      <div dangerouslySetInnerHTML={{ __html: preview.body_html }} />
                    </div>
                  </TabsContent>
                  <TabsContent value="html" className="mt-4">
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                      {preview.body_html}
                    </pre>
                  </TabsContent>
                </Tabs>
                
                {preview.variables_used.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-gray-600 mb-2">Variables Used:</h4>
                    <div className="flex flex-wrap gap-1">
                      {preview.variables_used.map((variable) => (
                        <span
                          key={variable}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

### TemplatesList Component
```typescript
// src/components/admin/TemplatesList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import TemplateEditor from './TemplateEditor';

interface Template {
  id: string;
  code: string;
  name: string;
  description?: string;
  channel: 'inapp' | 'email' | 'sms';
  subject?: string;
  body_md: string;
  variables: string[];
  is_active: boolean;
  version: number;
  updated_at: string;
  updated_by_profile?: { full_name: string };
}

export default function TemplatesList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, channelFilter, activeFilter]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter((template) => template.channel === channelFilter);
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(
        (template) => template.is_active === (activeFilter === 'active')
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleSaveTemplate = async (templateData: Template) => {
    try {
      const url = templateData.id
        ? `/api/admin/templates/${templateData.id}`
        : '/api/admin/templates';
      
      const method = templateData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        await fetchTemplates();
        setShowEditor(false);
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, is_active: !template.is_active })
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  if (showEditor) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setShowEditor(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notification Templates</h1>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowEditor(true);
          }}
        >
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="inapp">In-App</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      <Badge variant={template.channel === 'email' ? 'default' : 'secondary'}>
                        {template.channel}
                      </Badge>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm text-gray-500">v{template.version}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <code className="bg-gray-100 px-1 rounded">{template.code}</code>
                    </p>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Updated {new Date(template.updated_at).toLocaleDateString()} by{' '}
                      {template.updated_by_profile?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowEditor(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
