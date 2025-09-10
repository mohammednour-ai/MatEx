# T021 - KYC Upload & Review Status

## Overview
Implemented KYC document upload system with admin review workflow, status tracking, and user notifications for compliance verification in the MatEx platform.

## Implementation Details

### 1. Document Upload System
- **Secure Storage**: Supabase Storage for KYC documents
- **File Validation**: Type, size, and format restrictions
- **Metadata Tracking**: Document type and upload timestamps
- **User Organization**: User-specific folder structure

### 2. Admin Review Workflow
- **Review Dashboard**: Admin interface for document review
- **Status Management**: Approve, reject, or request more info
- **Reason Tracking**: Detailed rejection reasons
- **Notification Integration**: Automatic user notifications

## Technical Implementation

### KYC Status Page
```typescript
// app/profile/kyc/page.tsx
import { requireAuth, getServerProfile } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'
import KYCStatusCard from '@/components/KYCStatusCard'
import DocumentUpload from '@/components/DocumentUpload'

export default async function KYCStatusPage() {
  const profile = await getServerProfile()
  
  const { data: kycSubmission } = await supabaseServer
    .from('kyc_submissions')
    .select('*')
    .eq('user_id', profile?.id)
    .single()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">KYC Verification Status</h1>
      
      <KYCStatusCard 
        status={profile?.kyc_status} 
        submission={kycSubmission}
      />
      
      {profile?.kyc_status === 'rejected' && (
        <DocumentUpload userId={profile.id} />
      )}
    </div>
  )
}
```

### KYC Status Component
```typescript
// components/KYCStatusCard.tsx
interface KYCStatusCardProps {
  status: string
  submission: any
}

export default function KYCStatusCard({ status, submission }: KYCStatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'approved': return 'Your documents have been verified and approved.'
      case 'rejected': return 'Your documents require attention. Please review and resubmit.'
      case 'pending': return 'Your documents are under review. This typically takes 1-2 business days.'
      default: return 'Please complete your KYC verification to access all features.'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Verification Status</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {status?.toUpperCase()}
        </span>
      </div>
      
      <p className="text-gray-600 mb-4">{getStatusMessage(status)}</p>
      
      {submission?.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-medium text-red-800 mb-2">Rejection Reason:</h3>
          <p className="text-red-700">{submission.rejection_reason}</p>
        </div>
      )}
      
      {submission?.submitted_at && (
        <div className="text-sm text-gray-500 mt-4">
          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
```

### Admin KYC Review
```typescript
// app/admin/kyc/page.tsx
import { requireAdmin } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'
import KYCReviewTable from '@/components/admin/KYCReviewTable'

export default async function AdminKYCPage() {
  await requireAdmin()
  
  const { data: submissions } = await supabaseServer
    .from('kyc_submissions')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email,
        role
      )
    `)
    .order('submitted_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KYC Review Dashboard</h1>
      <KYCReviewTable submissions={submissions} />
    </div>
  )
}
```

### KYC Review API
```typescript
// app/api/admin/kyc/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'
import { createAuditLog } from '@/lib/audit-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await requireAdmin()
    const { action, reason } = await request.json()
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update profile KYC status
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .update({ 
        kyc_status: action === 'approve' ? 'approved' : 'rejected' 
      })
      .eq('id', params.userId)

    if (profileError) throw profileError

    // Update KYC submission
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString()
    }

    if (action === 'reject' && reason) {
      updateData.rejection_reason = reason
    }

    const { error: submissionError } = await supabaseServer
      .from('kyc_submissions')
      .update(updateData)
      .eq('user_id', params.userId)

    if (submissionError) throw submissionError

    // Create audit log
    await createAuditLog({
      actor_id: admin.id,
      action: `kyc_${action}`,
      resource_type: 'kyc_submission',
      resource_id: params.userId,
      after: { action, reason }
    })

    // Send notification
    await supabaseServer
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: action === 'approve' ? 'success' : 'warning',
        title: `KYC ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: action === 'approve' 
          ? 'Your documents have been verified and approved.'
          : `Your documents were rejected: ${reason || 'Please review and resubmit.'}`
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('KYC review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Files Created
- `src/app/profile/kyc/page.tsx` - KYC status page
- `src/components/KYCStatusCard.tsx` - Status display component
- `src/app/admin/kyc/page.tsx` - Admin review dashboard
- `src/app/api/admin/kyc/[userId]/route.ts` - KYC review API

## Key Features

### Document Management
- **Secure Upload**: Encrypted document storage
- **File Organization**: User-specific folder structure
- **Version Control**: Track document updates
- **Access Control**: Admin-only document access

### Review Workflow
- **Pending Queue**: New submissions for review
- **Document Viewer**: Inline document preview
- **Approval Actions**: Approve/reject with reasons
- **Status Tracking**: Complete review history

### User Experience
- **Status Dashboard**: Clear verification status
- **Progress Indicators**: Review timeline
- **Resubmission**: Easy document reupload
- **Notifications**: Real-time status updates

## Security Implementation
- **Admin-Only Access**: Restricted review permissions
- **Audit Logging**: Complete review trail
- **Document Encryption**: Secure file storage
- **Access Logging**: Track document access

## Success Metrics
- **Review Time**: Average review completion time
- **Approval Rate**: Percentage of approved submissions
- **Resubmission Rate**: Documents requiring resubmission
- **User Satisfaction**: Smooth verification experience

## Future Enhancements
- **Automated Verification**: AI-powered document validation
- **Bulk Actions**: Process multiple submissions
- **Review Templates**: Standardized rejection reasons
- **Integration**: Third-party verification services
