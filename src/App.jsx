import React, { useEffect, useMemo, useState } from "react";

/**
 * Weekly Budget Buddy – ultra-simple, flexible weekly budgeting app
 * - Set a weekly budget (AUD by default)
 * - Add expenses (amount, category, note, date)
 * - See remaining this week + a progress bar
 * - Quick category setup, edit & delete entries
 * - Data persists in localStorage
 *
 * Notes:
 * - Week starts on Monday (common AU convention)
 * - Currency symbol defaults to $; change in Settings if you like
 */

const STORAGE_KEY = "weekly-budget-buddy:v1";

function mondayStart(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sundayEnd(date = new Date()) {
  const m = mondayStart(date);
  const s = new Date(m);
  s.setDate(m.getDate() + 6);
  s.setHours(23, 59, 59, 999);
  return s;
}

function formatAUD(n, symbol = "$") {
  if (Number.isNaN(n)) return `${symbol}0.00`;
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const defaultState = {
  settings: {
    currencySymbol: "$",
    weeklyBudget: 500,
    categories: ["Groceries", "Transport", "Eating Out", "Bills", "Fun"],
  },
  expenses: [], // { id, amount, category, note, dateISO }
};

export default function App() {
  const [state, setState] = useState(() => loadState() || defaultState);
  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState({ amount: "", category: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => saveState(state), [state]);

  // Ensure form category defaults to first option
  useEffect(() => {
    if (!form.category && state.settings.categories.length) {
      setForm((f) => ({ ...f, category: state.settings.categories[0] }));
    }
  }, [state.settings.categories]);

  const week = useMemo(() => {
    const start = mondayStart();
    const end = sundayEnd();
    const inWeek = state.expenses.filter((e) => {
      const t = new Date(e.dateISO).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    const spent = inWeek.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { start, end, inWeek, spent, remaining: Math.max(0, state.settings.weeklyBudget - spent) };
  }, [state.expenses, state.settings.weeklyBudget]);

  const byCategory = useMemo(() => {
    const map = Object.fromEntries(state.settings.categories.map((c) => [c, 0]));
    for (const e of week.inWeek) {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    }
    return map;
  }, [week.inWeek, state.settings.categories]);

  function resetWeek() {
    // No action needed: we show only current week automatically.
    // This button exists to provide a mental checkpoint & optional cleanup
    const start = mondayStart();
    setState((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => new Date(e.dateISO) >= start),
    }));
  }

  function addOrUpdateExpense(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    const payload = {
      id: editingId || crypto.randomUUID(),
      amount,
      category: form.category || state.settings.categories[0] || "Other",
      note: form.note?.trim() || "",
      dateISO: form.date || new Date().toISOString().slice(0, 10),
    };
    setState((s) => ({
      ...s,
      expenses: editingId ? s.expenses.map((x) => (x.id === editingId ? payload : x)) : [payload, ...s.expenses],
    }));
    setForm({ amount: "", category: state.settings.categories[0] || "", note: "", date: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
  }

  function editExpense(id) {
    const x = state.expenses.find((e) => e.id === id);
    if (!x) return;
    setForm({ amount: String(x.amount), category: x.category, note: x.note, date: x.dateISO.slice(0, 10) });
    setEditingId(id);
  }

  function deleteExpense(id) {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));
    if (editingId === id) {
      setEditingId(null);
      setForm({ amount: "", category: state.settings.categories[0] || "", note: "", date: new Date().toISOString().slice(0, 10) });
    }
  }

  function Settings() {
    const [currencySymbol, setCurrencySymbol] = useState(state.settings.currencySymbol);
    const [weeklyBudget, setWeeklyBudget] = useState(state.settings.weeklyBudget);
    const [categories, setCategories] = useState(state.settings.categories.join(", "));

    function save() {
      const list = categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setState((s) => ({
        ...s,
        settings: {
          ...s.settings,
          currencySymbol: currencySymbol || "$",
          weeklyBudget: Math.max(0, Number(weeklyBudget) || 0),
          categories: list.length ? list : ["General"],
        },
      }));
      setShowSettings(false);
    }

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-2xl shadow-xl p-6 space-y-5">
          <h2 className="text-xl font-semibold">Settings</h2>
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Currency symbol</span>
              <input className="border rounded-xl px-3 py-2" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Weekly budget</span>
              <input type="number" className="border rounded-xl px-3 py-2" value={weeklyBudget} onChange={(e) => setWeeklyBudget(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Categories (comma-separated)</span>
              <input className="border rounded-xl px-3 py-2" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Groceries, Transport, …" />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="px-4 py-2 rounded-xl border" onClick={() => setShowSettings(false)}>Cancel</button>
            <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(100, Math.round(((state.settings.weeklyBudget - week.remaining) / Math.max(1, state.settings.weeklyBudget)) * 100));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 p-4 sm:p-8">
      {showSettings && <Settings />}

      <div className="max-w-5xl mx-auto grid gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Weekly Budget Buddy</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl border" onClick={() => setShowSettings(true)}>Settings</button>
            <button className="px-3 py-2 rounded-xl border" onClick={resetWeek}>Tidy older entries</button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow">
            <div className="text-sm text-zinc-500">This week</div>
            <div className="mt-1 font-semibold">{week.start.toLocaleDateString()} – {week.end.toLocaleDateString()}</div>
            <div className="mt-4 text-4xl font-bold">{formatAUD(week.remaining, state.settings.currencySymbol)} left</div>
            <div className="mt-1 text-sm text-zinc-500">of {formatAUD(state.settings.weeklyBudget, state.settings.currencySymbol)}</div>
            <div className="mt-4 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-3 bg-zinc-900 dark:bg-white" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-xs text-zinc-500">Spent {formatAUD(week.spent, state.settings.currencySymbol)} • {progress}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow md:col-span-2">
            <h2 className="font-semibold mb-3">Add expense</h2>
            <form onSubmit={addOrUpdateExpense} className="grid sm:grid-cols-4 gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                className="border rounded-xl px-3 py-2"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
              <select className="border rounded-xl px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {state.settings.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="border rounded-xl px-3 py-2" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <input type="date" className="border rounded-xl px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <div className="sm:col-span-4 flex gap-2 justify-end">
                {editingId && (
                  <button type="button" className="px-4 py-2 rounded-xl border" onClick={() => { setEditingId(null); setForm({ amount: "", category: state.settings.categories[0] || "", note: "", date: new Date().toISOString().slice(0, 10) }); }}>Cancel edit</button>
                )}
                <button className="px-4 py-2 rounded-xl bg-black text-white">{editingId ? "Update" : "Add"}</button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow">
            <h3 className="font-semibold mb-3">This week by category</h3>
            <ul className="space-y-2">
              {state.settings.categories.map((c) => (
                <li key={c} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c}</span>
                  <span className="font-medium">{formatAUD(byCategory[c] || 0, state.settings.currencySymbol)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow">
            <h3 className="font-semibold mb-3">Expenses (this week first)</h3>
            {week.inWeek.length === 0 ? (
              <div className="text-sm text-zinc-500">No expenses yet. Add your first one above.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-zinc-500">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Note</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...week.inWeek, ...state.expenses.filter((e) => !week.inWeek.includes(e))].map((e) => (
                      <tr key={e.id} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="py-2 whitespace-nowrap">{new Date(e.dateISO).toLocaleDateString()}</td>
                        <td className="py-2 whitespace-nowrap">{e.category}</td>
                        <td className="py-2 max-w-[20ch] truncate" title={e.note}>{e.note}</td>
                        <td className="py-2 whitespace-nowrap font-medium">{formatAUD(e.amount, state.settings.currencySymbol)}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button className="px-2 py-1 rounded-lg border mr-2" onClick={() => editExpense(e.id)}>Edit</button>
                          <button className="px-2 py-1 rounded-lg border" onClick={() => deleteExpense(e.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <footer className="text-xs text-zinc-500 text-center mt-4">
          Week starts Monday • Data stored on your device • Designed for quick, no-fuss budgeting
        </footer>
      </div>
    </div>
  );
}
