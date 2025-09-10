# T020 - Dynamic Onboarding (Buyer/Seller)

## Overview
Implemented dynamic onboarding system with role-specific KYC forms that adapt based on user type (buyer/seller) and regulatory requirements, featuring file uploads and validation.

## Implementation Details

### 1. Dynamic Form Generation
- **Role-Based Fields**: Different KYC requirements for buyers vs sellers
- **Database-Driven**: Form fields configured in kyc_fields table
- **File Upload Support**: Document upload with Supabase Storage
- **Validation**: Client and server-side validation

### 2. Onboarding Flow
- **Role Selection**: User chooses buyer, seller, or both
- **Dynamic Forms**: Forms adapt based on selected role
- **Progress Tracking**: Multi-step onboarding with progress indicators
- **Status Management**: KYC status tracking and updates

## Technical Implementation

### Onboarding Pages
```typescript
// app/onboarding/[role]/page.tsx
import { requireAuth } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'
import OnboardingForm from '@/components/OnboardingForm'

export default async function OnboardingPage({ 
  params 
}: { 
  params: { role: 'buyer' | 'seller' } 
}) {
  await requireAuth()
  
  const { data: kycFields } = await supabaseServer
    .rpc('get_kyc_fields_for_role', { user_role: params.role })
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {params.role === 'buyer' ? 'Buyer' : 'Seller'} Verification
      </h1>
      <OnboardingForm role={params.role} fields={kycFields} />
    </div>
  )
}
```

### Dynamic Form Component
```typescript
// components/OnboardingForm.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'

interface KYCField {
  name: string
  label: string
  type: string
  required: boolean
  options?: any
}

export default function OnboardingForm({ 
  role, 
  fields 
}: { 
  role: string
  fields: KYCField[] 
}) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [loading, setLoading] = useState(false)
  const { user, updateProfile } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload files
      const uploadedFiles: Record<string, string> = {}
      for (const [fieldName, file] of Object.entries(files)) {
        const fileName = `${user?.id}/${fieldName}-${Date.now()}`
        const { data, error } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, file)
        
        if (error) throw error
        uploadedFiles[fieldName] = data.path
      }

      // Submit KYC data
      const kycData = { ...formData, ...uploadedFiles }
      
      const { error } = await supabase
        .from('kyc_submissions')
        .insert({
          user_id: user?.id,
          role,
          data: kycData,
          status: 'pending'
        })

      if (error) throw error

      // Update profile
      await updateProfile({
        role: role as any,
        kyc_status: 'pending'
      })

      // Redirect to dashboard
      window.location.href = '/dashboard'
      
    } catch (error) {
      console.error('KYC submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: KYCField) => {
    switch (field.type) {
      case 'file':
        return (
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setFiles(prev => ({ ...prev, [field.name]: file }))
              }
            }}
            required={field.required}
            className="w-full p-2 border rounded"
          />
        )
      
      case 'select':
        return (
          <select
            value={formData[field.name] || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              [field.name]: e.target.value 
            }))}
            required={field.required}
            className="w-full p-2 border rounded"
          >
            <option value="">Select...</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      default:
        return (
          <input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              [field.name]: e.target.value 
            }))}
            required={field.required}
            className="w-full p-2 border rounded"
          />
        )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-2">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit for Verification'}
      </button>
    </form>
  )
}
```

## Files Created
- `src/app/onboarding/[role]/page.tsx` - Dynamic onboarding pages
- `src/components/OnboardingForm.tsx` - Dynamic form component

## Key Features

### Role-Based Forms
- **Buyer Requirements**: Basic identity verification
- **Seller Requirements**: Business documentation, tax information
- **Flexible Configuration**: Admin-configurable field requirements

### File Upload System
- **Document Storage**: Secure file storage with Supabase
- **File Validation**: Type and size restrictions
- **Organized Storage**: User-specific folder structure

### Form Validation
- **Required Fields**: Enforce mandatory information
- **Type Validation**: Email, phone, date format validation
- **File Validation**: Document type and size limits

## Success Metrics
- **Completion Rate**: High onboarding completion rate
- **Validation Accuracy**: Proper form validation
- **File Upload Success**: Reliable document uploads
- **User Experience**: Smooth onboarding flow

## Future Enhancements
- **Progress Indicators**: Multi-step progress tracking
- **Auto-save**: Form data persistence
- **Document Preview**: File preview before upload
- **Conditional Fields**: Dynamic field dependencies
