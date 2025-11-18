import React from 'react'
import Layout from './Layout'
import { firebaseAuth } from '@/lib/firebase'
import {
  multiFactor,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  User,
} from 'firebase/auth'

export default function TwoFactorSetup() {
  const user = firebaseAuth.currentUser as User | null
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [otpUrl, setOtpUrl] = React.useState<string | null>(null)
  const [verificationCode, setVerificationCode] = React.useState('')
  const [enrolled, setEnrolled] = React.useState(false)

  const beginEnrollment = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const mfa = multiFactor(user)
      const session = await mfa.getSession()
      const secret = await TotpMultiFactorGenerator.generateSecret(session)
      setOtpUrl(secret.uri)
      ;(window as any).__totpSecret = secret
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start TOTP setup')
    } finally {
      setLoading(false)
    }
  }

  const completeEnrollment = async () => {
    if (!user) return
    const secret = (window as any).__totpSecret
    if (!secret) {
      setError('No TOTP secret. Start setup again.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await multiFactor(user).enroll(secret, verificationCode, 'Authenticator')
      setEnrolled(true)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout currentPageName="TwoFactorSetup">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-4">Two-Factor Authentication</h1>
        {!user ? (
          <p>Please sign in to set up 2FA.</p>
        ) : (
          <div className="space-y-6">
            {!otpUrl && !enrolled && (
              <div>
                <p className="text-sm text-gray-700 mb-4">Secure your account by adding a TOTP authenticator (e.g., Google Authenticator, 1Password, Authy).</p>
                <button
                  onClick={beginEnrollment}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                >
                  {loading ? 'Starting…' : 'Start setup'}
                </button>
              </div>
            )}

            {otpUrl && !enrolled && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-700 mb-2">Scan this QR code in your authenticator app:</p>
                  <img
                    alt="TOTP QR"
                    className="border rounded"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpUrl)}`}
                  />
                  <p className="text-xs text-gray-500 mt-2 break-all">Or use URL: {otpUrl}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Enter 6-digit code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  onClick={completeEnrollment}
                  disabled={loading || verificationCode.length < 6}
                  className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'Verify and enable'}
                </button>
              </div>
            )}

            {enrolled && <p className="text-green-700">Two-factor authentication enabled.</p>}
          </div>
        )}
      </div>
    </Layout>
  )
}
