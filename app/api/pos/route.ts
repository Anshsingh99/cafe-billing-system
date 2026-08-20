import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const db = createAdminClient()
    const kind = new URL(request.url).searchParams.get('kind') ?? 'all'
    const result: Record<string, unknown> = {}
    if (kind === 'all' || kind === 'products') { const { data, error } = await db.from('products').select('id,name,category,description,price,is_available,is_active').eq('is_active', true).order('category').order('name'); if (error) throw error; result.products = data ?? [] }
    if (kind === 'all' || kind === 'tables') { const { data, error } = await db.from('cafe_tables').select('id,table_number,status,is_active').eq('is_active', true).order('table_number'); if (error) throw error; result.tables = data ?? [] }
    if (kind === 'all' || kind === 'settings') { const { data, error } = await db.from('cafe_settings').select('id,cafe_name,gst_percentage,gst_number,currency_symbol').eq('id', true).maybeSingle(); if (error) throw error; result.settings = data ?? { gst_percentage: 5, cafe_name: 'Ullas Cafe', currency_symbol: '₹' } }
    if (kind === 'history' || kind === 'analytics') { const params = new URL(request.url).searchParams; const customer = params.get('customer')?.trim() || ''; const month = params.get('month') || ''; const sort = params.get('sort') === 'oldest' ? true : false; let query = db.from('orders').select('id,bill_number,table_id,subtotal,gst_amount,total,gst_percentage,customer_name,customer_phone,completed_at,order_items(id,product_name,unit_price,quantity,line_total)').eq('status','completed'); if (customer) query = query.ilike('customer_name', `%${customer}%`); if (month && /^\\d{4}-\\d{2}$/.test(month)) { const start = `${month}-01T00:00:00.000Z`; const endDate = new Date(`${month}-01T00:00:00.000Z`); endDate.setUTCMonth(endDate.getUTCMonth() + 1); query = query.gte('completed_at', start).lt('completed_at', endDate.toISOString()) } const { data, error } = await query.order('completed_at', { ascending: sort }).limit(500); if (error) throw error; result.history = data ?? []; const orders = data ?? []; const items = orders.flatMap((o: any) => o.order_items ?? []); const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>(); items.forEach((item: any) => { const old = itemMap.get(item.product_name) ?? { name: item.product_name, quantity: 0, revenue: 0 }; old.quantity += Number(item.quantity); old.revenue += Number(item.line_total); itemMap.set(item.product_name, old) }); result.analytics = { todayTotal: orders.filter((o: any) => new Date(o.completed_at).toDateString() === new Date().toDateString()).reduce((sum: number, o: any) => sum + Number(o.total), 0), todayBills: orders.filter((o: any) => new Date(o.completed_at).toDateString() === new Date().toDateString()).length, lastThreeMonths: orders.filter((o: any) => new Date(o.completed_at) >= new Date(Date.now() - 90 * 86400000)).reduce((sum: number, o: any) => sum + Number(o.total), 0), productSales: [...itemMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8) } }
    return NextResponse.json(result)
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load POS data' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const db = createAdminClient(); const body = await request.json(); const kind = body.kind
    if (kind === 'product') { const { data, error } = await db.from('products').insert({ name: String(body.name).trim(), category: String(body.category || 'Other').trim(), price: Number(body.price), description: String(body.description || ''), is_available: true, is_active: true }).select().single(); if (error) throw error; return NextResponse.json({ product: data }) }
    if (kind === 'table') { const { data: existing, error: existingError } = await db.from('cafe_tables').select('table_number').eq('is_active', true).order('table_number'); if (existingError) throw existingError; const used = new Set((existing ?? []).map((row: { table_number: number }) => Number(row.table_number)).filter((number) => Number.isInteger(number) && number > 0)); let tableNumber = 1; while (used.has(tableNumber)) tableNumber += 1; let data: any = null; let error: any = null
      for (let attempt = 0; attempt < 100; attempt += 1) { const candidate = tableNumber + attempt; const result = await db.from('cafe_tables').insert({ table_number: candidate, status: 'available', is_active: true }).select('id,table_number,status,is_active').single(); data = result.data; error = result.error; if (!error) break; const message = String(error.message).toLowerCase(); if (!message.includes('duplicate key') && !message.includes('cafe_tables_table_number_key') && !message.includes('table_number_check')) throw new Error(`Could not save table: ${error.message}`) }
      if (error) throw new Error('Could not save table after trying 100 available numbers. Please try again.'); return NextResponse.json({ table: data }) }
    return NextResponse.json({ error: 'Unsupported create operation' }, { status: 400 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create record' }, { status: 400 }) }
}

export async function PUT(request: Request) {
  try {
    const db = createAdminClient(); const body = await request.json()
    if (body.kind !== 'bill') return NextResponse.json({ error: 'Unsupported save operation' }, { status: 400 })
    const items = Array.isArray(body.items) ? body.items : []
    if (!body.table_id || !items.length) return NextResponse.json({ error: 'A table and at least one item are required' }, { status: 400 })
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + Number(item.price) * Number(item.quantity), 0)
    const gstPercentage = Number(body.gst_percentage ?? 5); const gstAmount = Math.round(subtotal * gstPercentage / 100); const total = subtotal + gstAmount
    const { data: order, error: orderError } = await db.from('orders').insert({ table_id: body.table_id, status: 'completed', subtotal, gst_percentage: gstPercentage, gst_amount: gstAmount, total, customer_name: String(body.customer_name || ''), customer_phone: String(body.customer_phone || ''), completed_at: new Date().toISOString() }).select().single()
    if (orderError) throw orderError
    const { error: itemError } = await db.from('order_items').insert(items.map((item: { product_id: string; name: string; price: number; quantity: number }) => ({ order_id: order.id, product_id: item.product_id, product_name: item.name, unit_price: Number(item.price), quantity: Number(item.quantity), line_total: Number(item.price) * Number(item.quantity) })))
    if (itemError) throw itemError
    await db.from('cafe_tables').update({ status: 'available' }).eq('id', body.table_id)
    return NextResponse.json({ order, total, gst_amount: gstAmount })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save bill' }, { status: 400 }) }
}

export async function PATCH(request: Request) {
  try {
    const db = createAdminClient(); const body = await request.json()
    if (body.kind === 'settings') { const { data, error } = await db.from('cafe_settings').update({ gst_percentage: Number(body.gst_percentage), gst_number: String(body.gst_number || '').trim() || null, updated_at: new Date().toISOString() }).eq('id', true).select().single(); if (error) throw error; return NextResponse.json({ settings: data }) }
    return NextResponse.json({ error: 'Unsupported update operation' }, { status: 400 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save changes' }, { status: 400 }) }
}

export async function DELETE(request: Request) {
  try {
    const db = createAdminClient(); const body = await request.json(); if (body.kind === 'bill') { const { error } = await db.from('orders').delete().eq('id', body.id); if (error) throw error; return NextResponse.json({ ok: true }) } const tableName = body.kind === 'product' ? 'products' : 'cafe_tables'; const { error } = await db.from(tableName).delete().eq('id', body.id); if (error) throw error; return NextResponse.json({ ok: true })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete record' }, { status: 400 }) }
}
