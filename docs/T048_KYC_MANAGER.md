# T048: KYC Manager

## Overview
Create an admin KYC management interface that allows admins to approve/reject KYC applications with notes, preview uploaded documents, notify users of status changes, and maintain audit logs of all KYC decisions.

## Implementation Details

### KYC Management Page
Create the main admin KYC management interface.

```typescript
// src/app/admin/kyc/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon, 
  DocumentTextIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface KYCApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'both';
  kyc_status: 'pending' | 'approved' | 'rejected';
  company_name?: string;
  created_at: string;
  updated_at: string;
  kyc_documents?: KYCDocument[];
  kyc_notes?: string;
}

interface KYCDocument {
  id: string;
  user_id: string;
  field_name: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export default function AdminKYCPage() {
  const [applications, setApplications] = useState<KYCApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedApplication, setSelectedApplication] = useState<KYCApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [selectedStatus]);

  const loadApplications = async () => {
    try {
      const response = await fetch(`/api/admin/kyc?status=${selectedStatus}`);
      const data = await response.json();
      
      if (data.applications) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Failed to load KYC applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const openApplicationModal = (application: KYCApplication) => {
    setSelectedApplication(application);
    setReviewNotes(application.kyc_notes || '');
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setReviewNotes('');
  };

  const updateKYCStatus = async (userId: string, status: 'approved' | 'rejected', notes: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/kyc/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });

      if (!response.ok) {
        throw new Error('Failed to update KYC status');
      }

      // Refresh applications list
      await loadApplications();
      closeApplicationModal();
      
      alert(`KYC application ${status} successfully`);
    } catch (error) {
      console.error('Failed to update KYC status:', error);
      alert('Failed to update KYC status. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">KYC Management</h1>
        <p className="text-gray-600">Review and manage user verification applications</p>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedStatus === option.value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
              <p className="mt-1 text-sm text-gray-500">
                No KYC applications with status "{selectedStatus}" found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {application.full_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(application.kyc_status)}`}>
                          {application.kyc_status}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {application.role}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="font-medium">Email:</span>
                          <span className="ml-1">{application.email}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="font-medium">Phone:</span>
                          <span className="ml-1">{application.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>{new Date(application.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {application.company_name && (
                        <div className="mt-2 text-sm text-gray-500">
                          <span className="font-medium">Company:</span>
                          <span className="ml-1">{application.company_name}</span>
                        </div>
                      )}

                      {application.kyc_notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span>
                          <span className="ml-1">{application.kyc_notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openApplicationModal(application)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeApplicationModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    KYC Application Review - {selectedApplication.full_name}
                  </h3>
                  <button
                    onClick={closeApplicationModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Application Details */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Application Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.full_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedApplication.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedApplication.role}</p>
                      </div>
                      {selectedApplication.company_name && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Company</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedApplication.company_name}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Application Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedApplication.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Uploaded Documents</h4>
                    <div className="space-y-2">
                      {selectedApplication.kyc_documents && selectedApplication.kyc_documents.length > 0 ? (
                        selectedApplication.kyc_documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{doc.field_name}</p>
                                <p className="text-xs text-gray-500">{doc.file_name}</p>
                              </div>
                            </div>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View
                            </a>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No documents uploaded</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Add notes about your review decision..."
                  />
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => updateKYCStatus(selectedApplication.id, 'approved', reviewNotes)}
                  disabled={processing}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => updateKYCStatus(selectedApplication.id, 'rejected', reviewNotes)}
                  disabled={processing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={closeApplicationModal}
                  disabled={processing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### KYC Management API
Create API endpoints for KYC management operations.

```typescript
// src/app/api/admin/kyc/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const supabase = createClient();

    // Get KYC applications with user details
    const { data: applications, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        kyc_status,
        company_name,
        created_at,
        updated_at,
        kyc_notes
      `)
      .eq('kyc_status', status)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get KYC documents for each application
    const applicationsWithDocs = await Promise.all(
      applications.map(async (app) => {
        const { data: documents } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('user_id', app.id);

        return {
          ...app,
          kyc_documents: documents || []
        };
      })
    );

    return NextResponse.json({ applications: applicationsWithDocs });
  } catch (error) {
    console.error('Failed to get KYC applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Individual KYC Application API
Create API endpoint for updating individual KYC applications.

```typescript
// src/app/api/admin/kyc/[userId]/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-helpers';
import { createNotification } from '@/lib/notification-helpers';
import { emailRenderer } from '@/lib/email-renderer';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin access
    const { user: admin } = await requireAdmin();

    const { status, notes } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user details
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('full_name, email, kyc_status')
      .eq('id', params.userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update KYC status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_status: status,
        kyc_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the KYC decision in audit log
    await supabase
      .from('audit_log')
      .insert({
        actor_id: admin.id,
        action: `kyc_${status}`,
        before: { kyc_status: userProfile.kyc_status },
        after: { kyc_status: status, notes }
      });

    // Send notification to user
    const notificationTitle = status === 'approved' 
      ? 'KYC Application Approved' 
      : 'KYC Application Rejected';
    
    const notificationMessage = status === 'approved'
      ? 'Your KYC application has been approved. You can now access all platform features.'
      : `Your KYC application has been rejected. ${notes ? `Reason: ${notes}` : 'Please contact support for more information.'}`;

    await createNotification({
      userId: params.userId,
      type: status === 'approved' ? 'success' : 'error',
      title: notificationTitle,
      message: notificationMessage,
      link: '/profile'
    });

    // Send email notification
    if (userProfile.email) {
      const emailTemplate = status === 'approved' ? 'kyc_approved' : 'kyc_rejected';
      await emailRenderer.sendEmail(emailTemplate, userProfile.email, {
        userName: userProfile.full_name || 'User',
        status: status,
        notes: notes || '',
        supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `KYC application ${status} successfully` 
    });
  } catch (error) {
    console.error('Failed to update KYC status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### KYC Documents Table Schema
Create a table to store KYC document metadata.

```sql
-- supabase/migrations/023_kyc_documents.sql
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- Users can only access their own documents
CREATE POLICY "Users can view own documents" ON kyc_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON kyc_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON kyc_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can access all documents
CREATE POLICY "Admins can manage all documents" ON kyc_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_field_name ON kyc_documents(field_name);

-- Add kyc_notes column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_notes TEXT;
```

### Email Templates for KYC Notifications
Add email templates for KYC approval/rejection notifications.

```typescript
// scripts/seed-kyc-email-templates.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const kycEmailTemplates = [
  {
    code: 'kyc_approved',
    channel: 'email',
    subject: 'KYC Application Approved - MatEx',
    body_md: `# KYC Application Approved

Hello {{userName}},

Great news! Your KYC (Know Your Customer) application has been **approved**.

## What This Means
- You now have full access to all MatEx features
- You can create listings and participate in auctions
- Your account is fully verified and trusted

## Next Steps
- Start exploring the marketplace
- Create your first listing or place a bid
- Complete your profile if you haven't already

[Access Your Dashboard]({{dashboardUrl}})

Thank you for completing the verification process!

Best regards,  
The MatEx Team`,
    is_active: true
  },
  {
    code: 'kyc_rejected',
    channel: 'email',
    subject: 'KYC Application Update - MatEx',
    body_md: `# KYC Application Update

Hello {{userName}},

We have reviewed your KYC (Know Your Customer) application and unfortunately cannot approve it at this time.

{{#if notes}}
## Review Notes
{{notes}}
{{/if}}

## Next Steps
- Review the feedback provided above
- Ensure all required documents are clear and valid
- Resubmit your application with corrected information

## Need Help?
If you have questions about this decision or need assistance with your application, please don't hesitate to contact our support team.

[Contact Support]({{supportUrl}})

Best regards,  
The MatEx Team`,
    is_active: true
  }
];

async function seedKYCEmailTemplates() {
  console.log('Seeding KYC email templates...');
  
  for (const template of kycEmailTemplates) {
    const { error } = await supabase
      .from('notification_templates')
      .upsert(template, { onConflict: 'code,channel' });
    
    if (error) {
      console.error(`Failed to seed template ${template.code}:`, error);
    } else {
      console.log(`✓ Seeded template: ${template.code}`);
    }
  }
  
  console.log('KYC email template seeding complete!');
}

seedKYCEmailTemplates().catch(console.error);
```

### KYC Status Helper
Create helper functions for KYC status management.

```typescript
// src/lib/kyc-helpers.ts
import { createClient } from '@/lib/supabaseServer';

export type KYCStatus = 'pending' | 'approved' | 'rejected';

export async function getUserKYCStatus(userId: string): Promise<KYCStatus | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('kyc_status')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.kyc_status as KYCStatus;
}

export async function requireKYCApproval(userId: string): Promise<boolean> {
  const status = await getUserKYCStatus(userId);
  return status === 'approved';
}

export async function getKYCDocuments(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Failed to get KYC documents:', error);
    return [];
  }

  return data || [];
}

export function getKYCStatusColor(status: KYCStatus): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    case 'pending':
    default:
      return 'text-yellow-600 bg-yellow-100';
  }
}

export function getKYCStatusText(status: KYCStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending Review';
  }
}
```

## Files Created/Modified

### New Files
- `src/app/admin/kyc/page.tsx` - Admin KYC management interface
- `src/app/api/admin/kyc/route.ts` - KYC applications listing API
- `src/app/api/admin/kyc/[userId]/route.ts` - Individual KYC application management API
- `supabase/migrations/023_kyc_documents.sql` - KYC documents table schema
- `scripts/seed-kyc-email-templates.js` - KYC notification email templates
- `src/lib/kyc-helpers.ts` - KYC status management helpers

### Modified Files
- Email templates database with KYC approval/rejection templates

## Database Requirements
- Existing `profiles` table with KYC fields from T006
- New `kyc_documents` table for document storage
- Existing `audit_log` table from T018
- Existing `notification_templates` table from T012

## Success Metrics
- [ ] Admin can view KYC applications filtered by status
- [ ] Admin can review application details and documents
- [ ] Admin can approve/reject applications with notes
- [ ] Users receive notifications when KYC status changes
- [ ] Email notifications sent for KYC decisions
- [ ] Audit log records all KYC status changes
- [ ] Document preview works correctly
- [ ] KYC status updates reflect immediately in UI
- [ ] Mobile-responsive KYC management interface

## Testing Checklist
- [ ] KYC applications load correctly by status
- [ ] Application details modal displays all information
- [ ] Document links open correctly in new tab
- [ ] Approve action updates status and sends notifications
- [ ] Reject action updates status and sends notifications
- [ ] Review notes are saved and displayed
- [ ] Audit log entries are created for all actions
- [ ] Email notifications are sent to users
- [ ] Status filter works correctly
- [ ] Non-admin users cannot access KYC management API
- [ ] KYC helper functions work correctly
- [ ] Mobile interface is usable and responsive
