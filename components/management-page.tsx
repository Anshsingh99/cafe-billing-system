"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Coffee,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Table2,
  Trash2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  ["Dashboard", "/"],
  ["Billing", "/billing"],
  ["Products", "/products"],
  ["Tables", "/tables"],
  ["Bill History", "/bill-history"],
  ["Settings", "/settings"],
] as const;
const icons = {
  Dashboard: LayoutDashboard,
  Billing: ReceiptText,
  Products: Package,
  Tables: Table2,
  "Bill History": FileText,
  Settings,
} as const;
type Kind = "products" | "tables" | "settings" | "history" | "billing";

export function ManagementPage({
  kind,
  title,
  description,
}: {
  kind: Kind;
  title: string;
  description: string;
}) {
  const [data, setData] = useState<any>({
    products: [],
    tables: [],
    history: [],
    settings: { gst_percentage: 5 },
  });
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Beverages",
    price: "",
  });
  const [gst, setGst] = useState("5");
  const [gstNumber, setGstNumber] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [historyMonth, setHistoryMonth] = useState("");
  const [historySort, setHistorySort] = useState("newest");
  async function load() {
    const query = new URLSearchParams({
      kind: kind === "history" ? "history" : kind === "billing" ? "all" : kind,
    });
    if (kind === "history") {
      if (customerSearch) query.set("customer", customerSearch);
      if (historyMonth) query.set("month", historyMonth);
      if (historySort === "oldest") query.set("sort", "oldest");
    }
    const response = await fetch(`/api/pos?${query.toString()}`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) setMessage(json.error || "Unable to load data");
    else {
      setData(json);
      if (json.settings) {
        setGst(String(json.settings.gst_percentage));
        setGstNumber(String(json.settings.gst_number ?? ""));
      }
    }
  }
  useEffect(() => {
    void load();
  }, [kind]);
  async function mutate(url: string, options: RequestInit) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, options);
      const raw = await response.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }
      if (!response.ok)
        setMessage(json.error || `Action failed (${response.status})`);
      else {
        setMessage("Saved successfully");
        await load();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Network error while saving",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addProduct() {
    if (!newProduct.name.trim() || Number(newProduct.price) <= 0) {
      setMessage("Enter a name and valid price");
      return;
    }
    await mutate("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "product", ...newProduct }),
    });
    setNewProduct({ name: "", category: "Beverages", price: "" });
  }
  async function addTable() {
    await mutate("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "table" }),
    });
  }
  async function remove(kind: "product" | "table", id: string) {
    await mutate("/api/pos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
  }
  async function removeBill(id: string) {
    const password = window.prompt("Enter the deletion password:"); if (password !== "billingz99") { if (password !== null) setMessage("Incorrect password. Bill was not deleted."); return; }
    await mutate("/api/pos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "bill", id }),
    });
  }
  function shareBill(bill: any) {
    const phone = String(bill.customer_phone || "").replace(/\D/g, "");

    if (!phone) {
      setMessage("Please enter a valid WhatsApp number");
      return;
    }

    const target = phone.startsWith("91") ? phone : `91${phone}`;

    const billNumber = bill.bill_number ?? `UC-${bill.id.slice(0, 8)}`;

    const completedAt = bill.completed_at
      ? new Date(bill.completed_at)
      : new Date();

    const date = completedAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const time = completedAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemLines = (bill.order_items ?? [])
      .map(
        (item: any, index: number) =>
          `${index + 1}. ${item.product_name} × ${item.quantity} — ₹${item.line_total}`,
      )
      .join("\n");

    const gstPercentage = bill.gst_percentage ?? 0;
    const gstAmount = bill.gst_amount ?? 0;

    const gstLine =
      Number(gstPercentage) > 0
        ? `*GST (${gstPercentage}%):* ₹${gstAmount}`
        : "";

    const messageText = [
      "*☕ ULLAS CAFE & DINE*",
      "📍 Near Sheetla Mandir, Saket Nagar Colony, Varanasi",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "🧾 *BILL / ORDER RECEIPT*",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `*Bill No:* #${billNumber}`,
      `*Date:* ${date}`,
      `*Time:* ${time}`,
      "",
      `*Customer:* ${bill.customer_name || "Guest"}`,
      "",
      "━━━━━━━━━━━━━━━━━━",
      "*ITEMS*",
      "━━━━━━━━━━━━━━━━━━",
      "",
      itemLines || "No items",
      "",
      "━━━━━━━━━━━━━━━━━━",
`*Subtotal:* ₹${bill.subtotal ?? 0}`,
  ...(Number(bill.discount_amount) > 0 ? [`*Discount (${bill.discount_percentage ?? 0}%):* -₹${bill.discount_amount}`] : []),
  gstLine,
      `*TOTAL: ₹${bill.total ?? 0}*`,
      "━━━━━━━━━━━━━━━━━━",
      "",
      "🙏 *Thank you for visiting Ullas Cafe & Dine!*",
      "❤️ We hope to serve you again.",
    ]
      .filter((line) => line !== "")
      .join("\n");

    console.log("🔥 NEW BILL HISTORY WHATSAPP FORMAT");
    console.log(messageText);
    console.log("Has real newline:", messageText.includes("\n"));
    console.log("Has literal slash-n:", messageText.includes("\\n"));

    const whatsappUrl = `https://wa.me/${target}?text=${encodeURIComponent(messageText)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
  async function saveSettings() {
    const value = Number(gst);
    if (value < 0 || value > 100) {
      setMessage("GST must be between 0 and 100");
      return;
    }
    await mutate("/api/pos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "settings",
        gst_percentage: value,
        gst_number: gstNumber,
      }),
    });
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileNav && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`${mobileNav ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-72 flex-col bg-sidebar text-sidebar-foreground lg:flex`}
      >
        <div className="flex h-20 items-center gap-3 px-7">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Coffee className="size-5" />
          </div>
          <div>
            <p className="font-serif text-xl font-bold">Ullas Cafe</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/60">
              Cafe POS
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4 py-7">
          {links.map(([label, href]) => {
            const Icon = icons[label];
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileNav(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-screen lg:pl-72">
        <header className="flex h-20 items-center border-b border-border bg-card px-5 md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Ullas Cafe &amp; Dine
            </p>
            <h1 className="font-serif text-2xl font-bold">{title}</h1>
          </div>
        </header>
        <section className="mx-auto max-w-6xl p-5 md:p-8">
          <p className="text-sm text-muted-foreground">{description}</p>
          {message && (
            <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
              {message}
            </p>
          )}
          {kind === "products" && (
            <div className="mt-6 flex flex-col gap-6">
              <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_140px_auto]">
                <input
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  placeholder="Menu item name"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
                <input
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  placeholder="Category"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
                <input
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: e.target.value })
                  }
                  placeholder="Price"
                  type="number"
                  min="1"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
                <Button disabled={busy} onClick={() => void addProduct()}>
                  <Plus data-icon="inline-start" />
                  Add product
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.products ?? []).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                  >
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.category} · ₹{product.price}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void remove("product", product.id)}
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {kind === "tables" && (
            <div className="mt-6">
              <Button disabled={busy} onClick={() => void addTable()}>
                <Plus data-icon="inline-start" />
                Add table
              </Button>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(data.tables ?? []).map((table: any) => (
                  <div
                    key={table.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-5"
                  >
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Table
                      </p>
                      <p className="text-3xl font-bold">{table.table_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {table.status}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void remove("table", table.id)}
                      aria-label={`Delete table ${table.table_number}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {kind === "settings" && (
            <div className="mt-6 max-w-xl rounded-2xl border border-border bg-card p-6">
              <h2 className="font-serif text-xl font-bold">Billing settings</h2>
              <label className="mt-5 flex flex-col gap-2 text-sm font-medium">
                GST percentage
                <input
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="h-11 rounded-xl border border-input bg-background px-3"
                />
              </label>
              <label className="mt-5 flex flex-col gap-2 text-sm font-medium">
                GST number (optional)
                <input
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="e.g. 09ABCDE1234F1Z5"
                  className="h-11 rounded-xl border border-input bg-background px-3"
                />
              </label>
              <Button
                disabled={busy}
                className="mt-5"
                onClick={() => void saveSettings()}
              >
                <Settings data-icon="inline-start" />
                Save GST
              </Button>
            </div>
          )}
          {kind === "history" && (
            <div className="mt-6">
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-end">
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Customer name
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer"
                    className="mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Month
                  <input
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    type="month"
                    className="mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Sort
                  <select
                    value={historySort}
                    onChange={(e) => setHistorySort(e.target.value)}
                    className="mt-1 h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </label>
                <Button onClick={() => void load()}>
                  <Search data-icon="inline-start" />
                  Search
                </Button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="p-4">Bill</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.history ?? []).map((bill: any) => (
                      <tr
                        key={bill.id}
                        className="border-b border-border align-top last:border-0"
                      >
                        <td className="p-4 font-medium">
                          {bill.bill_number ?? bill.id.slice(0, 8)}
                          <p className="mt-1 text-xs font-normal text-muted-foreground">
                            {bill.completed_at
                              ? new Date(bill.completed_at).toLocaleString()
                              : "—"}
                          </p>
                        </td>
                        <td className="p-4">
                          {bill.customer_name || "Guest"}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Table{" "}
                            {bill.cafe_tables?.table_number ?? "—"} ·{" "}
                            {bill.customer_phone || "No phone"}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="min-w-52">
                            {(bill.order_items ?? []).length ? (
                              bill.order_items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between gap-4 py-1"
                                >
                                  <span>
                                    {item.product_name} × {item.quantity}
                                  </span>
                                  <span>₹{item.line_total}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground">
                                No item details
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
<div>Subtotal ₹{bill.subtotal ?? 0}</div>
  {Number(bill.discount_amount) > 0 && <div className="text-xs text-primary">Discount ({bill.discount_percentage ?? 0}%) · -₹{bill.discount_amount}</div>}
  <div className="text-xs text-muted-foreground">
                            GST {bill.gst_percentage ?? 0}% · ₹
                            {bill.gst_amount ?? 0}
                          </div>
                          <div className="mt-1 font-bold">
                            Total ₹{bill.total}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => shareBill(bill)}
                            >
                              <Share2 data-icon="inline-start" />
                              WhatsApp
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => void removeBill(bill.id)}
                              aria-label="Delete bill"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {kind === "billing" && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-serif text-xl font-bold">Billing</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a table from the dashboard to start a bill.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Open dashboard
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
