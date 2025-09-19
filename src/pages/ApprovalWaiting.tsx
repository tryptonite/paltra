import React from 'react'
import { Clock, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

export default function ApprovalWaiting(): React.JSX.Element {
  const { signOut, profile } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logos/paltra-logo.svg"
            alt="Paltra Logo"
            className="w-16 h-16 mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">PALTRA</h1>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Account Pending Approval
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Your account has been created and is waiting for administrator approval
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Account Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{profile?.email}</span>
                </div>
                {profile?.full_name && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Name: {profile.full_name}</span>
                  </div>
                )}
                {profile?.department && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Department: {profile.department}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">What happens next?</h4>
                  <p className="text-sm text-blue-700">
                    An administrator will review your account and approve access to the Paltra Warehouse Portal. 
                    You'll receive an email notification once your account is approved.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Approval typically takes:</h4>
                  <p className="text-sm text-green-700">
                    • 1-2 business hours during regular work hours<br />
                    • 24-48 hours during weekends or holidays
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="text-center text-sm text-gray-500">
              <p>
                Need immediate access? Contact your administrator or{' '}
                <a 
                  href="mailto:support@paltra.com" 
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  support@paltra.com
                </a>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="flex-1"
              >
                Sign Out
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                className="flex-1"
              >
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2025 Paltra. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
