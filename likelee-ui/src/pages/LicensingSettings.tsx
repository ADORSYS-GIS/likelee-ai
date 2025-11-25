import React from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Label as UILabel } from '@/components/ui/label'
import { Input as UIInput } from '@/components/ui/input'
import { Button as UIButton } from '@/components/ui/button'
import { Slider as UISlider } from '@/components/ui/slider'

const Label: any = UILabel
const Input: any = UIInput
const Button: any = UIButton
const Slider: any = UISlider

export default function LicensingSettings() {
  const { user, initialized, authenticated } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [monthlyUsd, setMonthlyUsd] = React.useState<string>('')
  const [perUseUsd, setPerUseUsd] = React.useState<number>(5)

  React.useEffect(() => {
    if (!initialized || !authenticated || !user || !supabase) return
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('base_monthly_price_cents, per_use_price_cents, currency_code')
          .eq('id', user.id)
          .maybeSingle()
        if (error) throw error
        if (data) {
          if (typeof data.base_monthly_price_cents === 'number') {
            setMonthlyUsd(String(Math.round(data.base_monthly_price_cents / 100)))
          }
          if (typeof data.per_use_price_cents === 'number') {
            setPerUseUsd(Math.max(5, Math.min(200, Math.round(data.per_use_price_cents / 100))))
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [initialized, authenticated, user?.id])

  const save = async () => {
    if (!user) return
    const monthly = Number(monthlyUsd)
    const perUse = Number(perUseUsd)
    if (!Number.isFinite(monthly) || monthly < 150) {
      alert('Minimum $150/month')
      return
    }
    if (!Number.isFinite(perUse) || perUse < 5 || perUse > 200) {
      alert('Per-use must be between $5 and $200')
      return
    }
    try {
      setSaving(true)
      const payload: any = {
        id: user.id,
        base_monthly_price_cents: Math.round(monthly * 100),
        per_use_price_cents: Math.round(perUse * 100),
        currency_code: 'USD',
        pricing_updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
      if (error) throw error
      alert('Pricing updated')
    } catch (e: any) {
      alert(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const completion = (() => {
    const mOk = Number(monthlyUsd) >= 150
    const pOk = Number(perUseUsd) >= 5 && Number(perUseUsd) <= 200
    return (mOk && pOk) ? 100 : (mOk || pOk) ? 50 : 0
  })()

  if (!initialized) return null
  if (!authenticated) return <div className="p-6">Please sign in.</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Licensing Settings</h1>
        <p className="text-sm text-gray-600">Pricing is public and USD-only. Set your monthly base and per-use prices.</p>
      </div>

      <div className="w-full h-2 bg-gray-200">
        <div className="h-2 bg-teal-500" style={{ width: `${completion}%` }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="monthly" className="text-sm font-medium text-gray-700 mb-2 block">Base monthly license price (USD)</Label>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">$</span>
            <Input
              id="monthly"
              type="number"
              min={150}
              step={1}
              value={monthlyUsd}
              onChange={(e: any) => {
                const v = String(e.target.value || '').replace(/[^0-9.]/g, '')
                setMonthlyUsd(v)
              }}
              className="border-2 border-gray-300 rounded-none"
              placeholder="150"
            />
            <span className="text-sm text-gray-600">/month</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimum $150/month.</p>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Per-use price (USD)</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-gray-700">$</span>
              <Input
                type="number"
                min={5}
                max={200}
                step={1}
                value={perUseUsd}
                onChange={(e: any) => {
                  const n = Number(e.target.value)
                  if (!Number.isFinite(n)) return
                  const clamped = Math.max(5, Math.min(200, Math.round(n)))
                  setPerUseUsd(clamped)
                }}
                className="w-24 border-2 border-gray-300 rounded-none"
              />
              <span className="text-sm text-gray-600">per use</span>
            </div>
            <div className="px-1">
              <Slider
                value={[Number(perUseUsd) || 5]}
                min={5}
                max={200}
                step={1}
                onValueChange={(vals: any) => {
                  const v = Array.isArray(vals) ? vals[0] : vals
                  const clamped = Math.max(5, Math.min(200, Math.round(Number(v) || 5)))
                  setPerUseUsd(clamped)
                }}
              />
            </div>
            <p className="text-xs text-gray-500">Choose between $5 and $200 per use. Typical bookings are $5–$15.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving || loading} className="h-12 bg-black text-white border-2 border-black rounded-none">
          {saving ? 'Saving…' : 'Save Pricing'}
        </Button>
      </div>
    </div>
  )
}
