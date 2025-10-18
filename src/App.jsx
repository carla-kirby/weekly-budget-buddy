
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
~
src/App.jsx[+] [unix] (22:26 13/10/2025)                                     1,1 All
-- INSERT --
# --- SAFETY BACKUP ---
cp src/App.jsx src/App.jsx.bak 2>/dev/null || echo "No previous backup needed."

# --- INJECT THE COLOR THEME FEATURE ---
cat > src/App.jsx <<'EOF'
import React, { useEffect, useMemo, useState } from "react";

const THEMES = {
  emerald: { btn: "bg-emerald-600 hover:bg-emerald-700", bar: "bg-emerald-600" },
  blue:    { btn: "bg-blue-600 hover:bg-blue-700",         bar: "bg-blue-600"    },
  violet:  { btn: "bg-violet-600 hover:bg-violet-700",     bar: "bg-violet-600"  },
  rose:    { btn: "bg-rose-600 hover:bg-rose-700",         bar: "bg-rose-600"    },
  amber:   { btn: "bg-amber-600 hover:bg-amber-700",       bar: "bg-amber-600"   },
};

const STORAGE_KEY = "weekly-budget-buddy:v1";

function mondayStart(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

const defaultState = {
  settings: {
    currencySymbol: "$",
    weeklyBudget: 500,
    categories: ["Groceries", "Transport", "Eating Out", "Bills", "Fun"],
    theme: "emerald"
  },
  expenses: [],
};

export default function App() {
  const [state, setState] = useState(() => loadState() || defaultState);
  const [form, setForm] = useState({ amount: "", category: "", note: "", date: new Date().toISOString().slice(0,10) });
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => saveState(state), [state]);
  const t = THEMES[state.settings.theme] || THEMES.emerald;

  const week = useMemo(() => {
    const start = mondayStart(), end = sundayEnd();
    const inWeek = state.expenses.filter(e => {
      const t = new Date(e.dateISO).getTime();
      return t >= start && t <= end;
    });
    const spent = inWeek.reduce((s,e)=>s+Number(e.amount||0),0);
    return { start, end, inWeek, spent, remaining: Math.max(0, state.settings.weeklyBudget - spent) };
  }, [state.expenses, state.settings.weeklyBudget]);

  function addExpense(e){
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if(!amt||amt<=0)return;
    const p = { id: editingId||crypto.randomUUID(), amount:amt, category:form.category, note:form.note, dateISO:form.date };
    setState(s=>({...s,expenses:editingId?s.expenses.map(x=>x.id===editingId?p:x):[p,...s.expenses]}));
    setForm({amount:"",category:s.state?.settings?.categories?.[0]||"",note:"",date:new Date().toISOString().slice(0,10)});
    setEditingId(null);
  }

  function Settings(){
    const [theme,setTheme]=useState(state.settings.theme);
    const [weeklyBudget,setWeeklyBudget]=useState(state.settings.weeklyBudget);
    function save(){
      setState(s=>({...s,settings:{...s.settings,theme,weeklyBudget:Number(weeklyBudget)||0}}));
      setShowSettings(false);
    }
    return(
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Settings</h2>
          <label className="grid gap-1">
            <span className="text-sm">Theme</span>
            <select className="border rounded-xl px-3 py-2" value={theme} onChange={e=>setTheme(e.target.value)}>
              <option value="emerald">Emerald</option>
              <option value="blue">Blue</option>
              <option value="violet">Violet</option>
              <option value="rose">Rose</option>
              <option value="amber">Amber</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Weekly budget</span>
            <input type="number" className="border rounded-xl px-3 py-2" value={weeklyBudget} onChange={e=>setWeeklyBudget(e.target.value)} />
          </label>
          <div className="flex gap-2 justify-end">
            <button className="px-4 py-2 rounded-xl border" onClick={()=>setShowSettings(false)}>Cancel</button>
            <button className={`px-4 py-2 rounded-xl text-white ${t.btn}`} onClick={save}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(100, Math.round(((state.settings.weeklyBudget - week.remaining)/Math.max(1,state.settings.weeklyBudget))*100));
  return(
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-4 sm:p-8">
      {showSettings && <Settings/>}
      <div className="max-w-5xl mx-auto grid gap-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Weekly Budget Buddy</h1>
          <button className="px-3 py-2 rounded-xl border" onClick={()=>setShowSettings(true)}>Settings</button>
        </header>
        <section className="p-4 rounded-2xl bg-white shadow">
          <div className="text-sm text-zinc-500">This week</div>
          <div className="mt-1 font-semibold">{week.start.toLocaleDateString()} – {week.end.toLocaleDateString()}</div>
          <div className="mt-4 text-4xl font-bold">{formatAUD(week.remaining)} left</div>
          <div className="mt-4 h-3 rounded-full bg-zinc-200 overflow-hidden">
            <div className={`h-3 ${t.bar}`} style={{width:`${progress}%`}}/>
          </div>
          <div className="mt-2 text-xs text-zinc-500">Spent {formatAUD(week.spent)} • {progress}%</div>
        </section>
      </div>
    </div>
  );
}
EOF

# --- COMMIT & PUSH ---
git add src/App.jsx
git commit -m "feat: add color theme system to Weekly Budget Buddy"
git push

echo "✅ Theme system added. Vercel will redeploy automatically. Hard-refresh your site after build."

