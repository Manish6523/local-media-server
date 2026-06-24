"use client"
import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'

export default function AdminPinGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [needsPin, setNeedsPin] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pin-status')
      .then(r => r.json())
      .then(data => {
        const alreadyUnlocked = sessionStorage.getItem('admin_unlocked') === 'true'
        if (!data.enabled || alreadyUnlocked) {
          setNeedsPin(false)
        } else {
          setNeedsPin(true)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    setVerifying(true)
    setError(false)
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    const data = await res.json()
    if (data.success) {
      sessionStorage.setItem('admin_unlocked', 'true')
      setNeedsPin(false)
    } else {
      setError(true)
      setPin('')
    }
    setVerifying(false)
  }

  if (loading) return null

  if (!needsPin) return <>{children}</>

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center">
      <div className={`flex flex-col items-center gap-6 ${error ? 'animate-shake' : ''}`}>
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock size={32} className="text-white" />
        </div>
        <h2 className="text-white text-xl font-bold">Enter PIN to continue</h2>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
          className="text-3xl tracking-[0.5em] text-center bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white w-64 focus:outline-none focus:border-violet-500"
          placeholder="••••"
        />
        {error && <p className="text-red-400 text-sm">Incorrect PIN</p>}
        <button
          onClick={handleSubmit}
          disabled={verifying || pin.length < 4}
          className="bg-white text-black font-bold px-8 py-3 rounded-full disabled:opacity-40"
        >
          {verifying ? 'Checking...' : 'Unlock'}
        </button>
      </div>
    </div>
  )
}
