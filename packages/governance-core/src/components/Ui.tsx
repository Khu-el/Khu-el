import type { InputHTMLAttributes, ReactNode } from 'react';

export function Card({ title, subtitle, children, right }: { title?: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
      {(title || right) && (
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            {title && <h3 className="font-semibold text-neutral-900">{title}</h3>}
            {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm mb-3">
      <span className="block font-medium text-neutral-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-400 mt-1">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 ${props.className ?? ''}`}
    />
  );
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput type="number" {...props} />;
}

export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 ${className ?? ''}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Button({ children, variant = 'primary', ...props }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-700',
    secondary: 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50',
    danger: 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50',
  }[variant];
  return (
    <button {...props} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${styles} ${props.className ?? ''}`}>
      {children}
    </button>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3 bg-neutral-50">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-neutral-900">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  note?: string;
}

export function Checklist({ items, onToggle }: { items: ChecklistItem[]; onToggle: (id: string) => void }) {
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-neutral-800" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        {doneCount} / {items.length} complete
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(item.id)}
              className="mt-1 h-4 w-4 rounded border-neutral-300"
            />
            <div>
              <p className={`text-sm ${item.done ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>{item.label}</p>
              {item.note && <p className="text-xs text-neutral-400">{item.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-200 mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-2 text-sm font-medium rounded-t-md -mb-px border-b-2 transition-colors ${
            active === t.id
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
