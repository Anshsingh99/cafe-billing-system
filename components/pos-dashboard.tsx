'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Coffee, FileText, LayoutDashboard, Menu, Package, Plus, ReceiptText, Settings, Table2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Product = { id: string; name: string; category: string; price: number }
type LineItem = Product & { quantity: number }
type Table = { id: string; table_number: number; status: string; items: LineItem[] }
const nav = [['Dashboard','/'],['Billing','/billing'],['Products','/products'],['Tables','/tables'],['Bill History','/bill-history'],['Settings','/settings']] as const
const icons = { Dashboard: LayoutDashboard, Billing: ReceiptText, Products: Package, Tables: Table2, 'Bill History': FileText, Settings } as const

export function PosDashboard() {
  const [message, setMessage] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [gst, setGst] = useState(5)
  const [gstNumber, setGstNumber] = useState('')
  const [checkout, setCheckout] = useState(false)
  const [paid, setPaid] = useState(false)
  const [customer, setCustomer] = useState({ name: '', phone: '' })
  const [quantity, setQuantity] = useState('1')
  const [mobileNav, setMobileNav] = useState(false)
  const cartStorageKey = 'ullas-cafe-pending-carts'
  const pendingTablesKey = 'ullas-cafe-pending-table-ids'

  async function load() {
    const response = await fetch('/api/pos?kind=all', { cache: 'no-store' })
    const json = await response.json()
    if (!response.ok) { setMessage(json.error || 'Unable to load POS data'); return }
    setProducts((json.products ?? []).map((p: Product) => ({ ...p, price: Number(p.price) })))
    let saved: Record<string, LineItem[]> = {}
    try { saved = JSON.parse(window.localStorage.getItem(cartStorageKey) || '{}') } catch { saved = {} }
    const nextTables = (json.tables ?? []).map((t: Table) => ({ ...t, items: saved[t.id] ?? [] as LineItem[] }))
    let pendingIds: string[] = []
    try { pendingIds = JSON.parse(window.localStorage.getItem(pendingTablesKey) || '[]') } catch { pendingIds = [] }
    const mergedTables = nextTables.map((table) => pendingIds.includes(table.id) && table.items.length ? { ...table, status: 'occupied' } : table)
    setTables(mergedTables)
    setSelectedId((current) => current && nextTables.some((t) => t.id === current) ? current : nextTables[0]?.id ?? '')
    setGst(Number(json.settings?.gst_percentage ?? 5)); setGstNumber(String(json.settings?.gst_number ?? ''))
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (tables.length) { window.localStorage.setItem(cartStorageKey, JSON.stringify(Object.fromEntries(tables.map((table) => [table.id, table.items])))); window.localStorage.setItem(pendingTablesKey, JSON.stringify(tables.filter((table) => table.items.length).map((table) => table.id))) } }, [tables])

  const current = tables.find((table) => table.id === selectedId) ?? tables[0]
  const filtered = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 24)
  const subtotal = useMemo(() => (current?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0), [current])
  const gstAmount = Math.round(subtotal * gst / 100)
  const total = subtotal + gstAmount

  function addItem(product: Product) {
    if (!current) return
    const count = Math.max(1, Number(quantity) || 1)
    setTables((all) => all.map((table) => { if (table.id !== current.id) return table; const existing = table.items.find((item) => item.id === product.id); const items = existing ? table.items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + count } : item) : [...table.items, { ...product, quantity: count }]; return { ...table, items, status: 'occupied' } }))
    setQuery(''); setQuantity('1')
  }
  function changeQuantity(productId: string, delta: number) { setTables((all) => all.map((table) => table.id === current?.id ? { ...table, items: table.items.map((item) => item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0) } : table)) }
  async function addTable() {
    let response: Response
    try { response = await fetch('/api/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'table' }) }) } catch { setMessage('Network error while adding table'); return }
    const raw = await response.text(); let json: any = {}; try { json = raw ? JSON.parse(raw) : {} } catch { json = {} }
    if (!response.ok) { setMessage(json.error || `Unable to add table (${response.status})`); return }
    if (json.table) { setTables((all) => [...all, { ...json.table, items: [] }]); setSelectedId(json.table.id); setMessage(`Table ${json.table.table_number} added successfully`) }
  }
  async function deleteTable(id: string) {
    const response = await fetch('/api/pos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'table', id }) })
    if (!response.ok) { const json = await response.json(); setMessage(json.error || 'Unable to delete table'); return }
    setTables((all) => all.filter((table) => table.id !== id)); setMessage('Table deleted')
    if (selectedId === id) setSelectedId(tables.find((table) => table.id !== id)?.id ?? '')
  }
  async function saveBill() {
    if (!current?.items.length) return
    const response = await fetch('/api/pos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'bill', table_id: current.id, items: current.items, gst_percentage: gst, customer_name: customer.name, customer_phone: customer.phone }) })
    const json = await response.json()
    if (!response.ok) { setMessage(json.error || 'Unable to save bill'); return }
    setPaid(true); setMessage('Bill saved to history')
  }
  function shareWhatsApp() {
    const digits = customer.phone.replace(/\D/g, '')
    if (!digits) return
    const target = digits.startsWith('91') ? digits : `91${digits}`
    const now = new Date(); const lines = [`*☕ ULLAS CAFE & DINE*`, `📍 Near Sheetla Mandir, Saket Nagar Colony, Varanasi`, '', `━━━━━━━━━━━━━━━━━━`, `🧾 *BILL / ORDER RECEIPT*`, `━━━━━━━━━━━━━━━━━━`, '', `*Bill No:* #${Date.now().toString().slice(-4)}`, `*Date:* ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, `*Time:* ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, '', `*Customer:* ${customer.name || 'Guest'}`, '', `━━━━━━━━━━━━━━━━━━`, `*ITEMS*`, `━━━━━━━━━━━━━━━━━━`, '', ...(current?.items ?? []).map((item, index) => `${index + 1}. ${item.name} × ${item.quantity} — ₹${item.price * item.quantity}`), '', `━━━━━━━━━━━━━━━━━━`, `*Subtotal:* ₹${subtotal}`, `*GST (${gst}%):* ₹${gstAmount}`, ...(gstNumber.trim() ? [`*GSTIN:* ${gstNumber.trim()}`] : []), `━━━━━━━━━━━━━━━━━━`, `*TOTAL: ₹${total}*`, `━━━━━━━━━━━━━━━━━━`, '', `🙏 *Thank you for visiting Ullas Cafe & Dine!*`, `❤️ We hope to serve you again.`]; window.open(`https://wa.me/${target}?text=${encodeURIComponent(lines.join('\\n'))}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="min-h-screen bg-background text-foreground">
    {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileNav(false)} />}
    <aside className={`${mobileNav ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-72 flex-col bg-sidebar text-sidebar-foreground lg:flex`}>
      <div className="flex h-20 items-center gap-3 px-7"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Coffee className="size-5" /></div><div><p className="font-serif text-xl font-bold">Ullas Cafe</p><p className="text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/60">Cafe POS</p></div></div>
      <nav className="flex flex-1 flex-col gap-1 px-4 py-7">{nav.map(([label, href]) => { const Icon = icons[label]; return <Link key={label} href={href} onClick={() => setMobileNav(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Icon className="size-[18px]" />{label}</Link> })}</nav>
    </aside>
    <main className="min-h-screen lg:pl-72"><header className="flex h-20 items-center border-b border-border bg-card px-5 md:px-8"><Button variant="ghost" size="icon" className="mr-3 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></Button><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ullas Cafe &amp; Dine</p><h1 className="font-serif text-2xl font-bold">Table orders</h1></div></header>
      <div className="mx-auto max-w-[1500px] p-5 md:p-8">{message && <p className="mb-5 rounded-xl bg-secondary px-4 py-3 text-sm">{message}</p>}<div className="mb-7 flex items-center justify-between"><div><h2 className="font-serif text-2xl font-bold">Tables</h2><p className="text-sm text-muted-foreground">Select a table, add items, and make a bill.</p></div><Button variant="outline" onClick={addTable}><Plus data-icon="inline-start" />Add table</Button></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{tables.map((table) => <div key={table.id} className={`rounded-2xl border bg-card p-5 ${selectedId === table.id ? 'border-primary ring-2 ring-primary/15' : 'border-border'}`}><button className="w-full text-left" onClick={() => setSelectedId(table.id)}><p className="text-xs uppercase text-muted-foreground">Table</p><p className="text-3xl font-bold">{table.table_number}</p><p className="text-sm text-muted-foreground">{table.items.length} items · {table.status}</p></button><div className="mt-4 flex gap-2"><Button size="sm" className="flex-1" onClick={() => setSelectedId(table.id)}><Plus data-icon="inline-start" />Add item</Button><Button size="icon" variant="ghost" onClick={() => void deleteTable(table.id)} aria-label={`Delete table ${table.table_number}`}><Trash2 /></Button></div></div>)}</div>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-xl font-bold">Table {current?.table_number ?? '—'} menu</h2><p className="text-sm text-muted-foreground">Search and add items to this table.</p></div><div className="flex w-full gap-2 sm:w-auto"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-sm sm:w-56" /><input value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantity" type="number" min="1" className="h-11 w-20 rounded-xl border border-input bg-background px-3 text-sm" /></div></div><div className="mt-5 flex max-h-96 flex-wrap content-start gap-2 overflow-auto">{filtered.map((product) => <button key={product.id} className="rounded-xl border border-border px-3 py-2 text-left hover:border-primary" onClick={() => addItem(product)}><span className="block text-sm font-semibold">{product.name}</span><span className="text-xs text-muted-foreground">₹{product.price} · {product.category}</span></button>)}</div></section>
          <aside className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Current bill</h2><span className="text-sm text-muted-foreground">{current?.items.length ?? 0} items</span></div><div className="mt-4 flex flex-col gap-2">{current?.items.map((item, index) => <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><span>{item.name}</span><span className="text-muted-foreground">×{item.quantity}</span></span><span className="flex items-center gap-1"><Button size="icon" variant="ghost" className="size-7" onClick={() => changeQuantity(item.id, -1)}>-</Button><span>₹{item.price * item.quantity}</span><Button size="icon" variant="ghost" className="size-7" onClick={() => changeQuantity(item.id, 1)}>+</Button></span></div>)}</div><div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div><div className="flex justify-between"><span>GST ({gst}%)</span><span>₹{gstAmount}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span>₹{total}</span></div></div><Button className="mt-5 w-full" disabled={!current?.items.length} onClick={() => setCheckout(true)}>Make bill</Button></aside></div>
      </div>
    </main>
    {checkout && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"><div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">{paid ? <><h2 className="font-serif text-2xl font-bold">Payment recorded</h2><p className="mt-2 text-sm text-muted-foreground">Your bill is ready to share.</p><div className="mt-6 flex gap-3"><Button variant="outline" className="flex-1" onClick={shareWhatsApp}>WhatsApp</Button><Button className="flex-1" onClick={() => { setPaid(false); setCheckout(false); setCustomer({ name: '', phone: '' }); setTables((all) => all.map((table) => table.id === current?.id ? { ...table, items: [], status: 'available' } : table)) }}>Done</Button></div></> : <><div className="flex items-center justify-between"><h2 className="font-serif text-2xl font-bold">Complete payment</h2><button aria-label="Close checkout" onClick={() => setCheckout(false)}><X /></button></div><div className="mt-5 flex flex-col gap-3"><input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Customer name" className="h-11 rounded-xl border border-input bg-background px-3" /><input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="Phone number for WhatsApp" type="tel" className="h-11 rounded-xl border border-input bg-background px-3" /></div><Button className="mt-5 w-full" onClick={() => void saveBill()}>Confirm payment · ₹{total}</Button></>}</div></div>}
  </div>
}
