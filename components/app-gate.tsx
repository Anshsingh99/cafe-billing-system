'use client'

import { FormEvent, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Coffee, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setLoggedIn(window.localStorage.getItem('ullas-cafe-login') === 'true'); setReady(true) }, [])
  if (!ready) return null
  if (!loggedIn) return <main className="flex min-h-screen items-center justify-center bg-background p-5"><form onSubmit={(event: FormEvent) => { event.preventDefault(); if (username === 'ullascafe' && password === 'billingz99') { window.localStorage.setItem('ullas-cafe-login', 'true'); setLoggedIn(true); setError('') } else setError('Use the provided cafe login details.') }} className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl"><div className="mb-7 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Coffee className="size-5" /></div><div><p className="font-serif text-xl font-bold">Ullas Cafe</p><p className="text-xs text-muted-foreground">Billing workspace</p></div></div><div className="mb-6 flex items-center gap-2"><LockKeyhole className="size-4 text-primary" /><h1 className="font-serif text-2xl font-bold">Sign in</h1></div><div className="flex flex-col gap-3"><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Username" className="h-11 rounded-xl border border-input bg-background px-3" /><input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" type="password" placeholder="Password" className="h-11 rounded-xl border border-input bg-background px-3" /><Button type="submit" className="h-11">Continue</Button></div>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}</form></main>
  return <>{children}</>
}

export function LogoutButton() { const router = useRouter(); return <button onClick={() => { window.localStorage.removeItem('ullas-cafe-login'); router.refresh() }} className="text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground">Log out</button> }
