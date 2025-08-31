'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  company_name: string
  role: 'buyer' | 'seller' | 'both' | 'admin'
  status: 'pending' | 'active' | 'suspended'
  email_verified: boolean
  kyc_status: 'pending' | 'in_review' | 'approved' | 'rejected'
  phone: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  website: string
  bio: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        setError('Failed to load profile')
        console.error('Profile load error:', profileError)
        return
      }

      setProfile({
        ...profileData,
        email: session.user.email || ''
      })
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Profile load exception:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => prev ? { ...prev, [name]: value } : null)
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          company_name: profile.company_name,
          role: profile.role,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          postal_code: profile.postal_code,
          country: profile.country,
          website: profile.website,
          bio: profile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) {
        setError('Failed to update profile')
        console.error('Profile update error:', updateError)
        return
      }

      setMessage('Profile updated successfully!')
      setIsEditing(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Profile update exception:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile not found</h2>
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-500"
          >
            Return to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-600">Manage your account information</p>
              </div>
              <div className="flex space-x-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.status === 'active' ? 'bg-green-100 text-green-800' :
                profile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Account: {profile.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.email_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                Email: {profile.email_verified ? 'Verified' : 'Unverified'}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                profile.kyc_status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                profile.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                KYC: {profile.kyc_status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                profile.role === 'both' ? 'bg-blue-100 text-blue-800' :
                profile.role === 'seller' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                Role: {profile.role}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{message}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Basic Information */}
              <div className="sm:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={profile.first_name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={profile.last_name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed here</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={profile.company_name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  value={profile.role}
                  onChange={handleInputChange}
                  disabled={!isEditing || profile.role === 'admin'}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="both">Both</option>
                  {profile.role === 'admin' && <option value="admin">Admin</option>}
                </select>
                {profile.role === 'admin' && (
                  <p className="mt-1 text-xs text-gray-500">Admin role cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  name="website"
                  value={profile.website || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://example.com"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Address Information */}
              <div className="sm:col-span-2 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  name="address"
                  value={profile.address || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={profile.city || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={profile.state || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  value={profile.postal_code || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  name="country"
                  value={profile.country || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>

              {/* Bio */}
              <div className="sm:col-span-2 mt-6">
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  name="bio"
                  rows={4}
                  value={profile.bio || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself or your company..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
            <div className="space-y-3">
              {!profile.email_verified && (
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Email Verification Required</h4>
                    <p className="text-sm text-yellow-700">Please verify your email to access all features</p>
                  </div>
                  <button className="text-sm font-medium text-yellow-800 hover:text-yellow-900">
                    Resend Verification
                  </button>
                </div>
              )}
              
              {profile.kyc_status !== 'approved' && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">KYC Verification</h4>
                    <p className="text-sm text-blue-700">Complete KYC to access advanced features</p>
                  </div>
                  <button 
                    onClick={() => router.push('/kyc/verify')}
                    className="text-sm font-medium text-blue-800 hover:text-blue-900"
                  >
                    Start KYC
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
