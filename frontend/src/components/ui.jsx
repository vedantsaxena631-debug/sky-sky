const STATUS = {
  online: { dot: 'bg-ok', text: 'text-ok', label: 'Online' },
  offline: { dot: 'bg-emergency', text: 'text-emergency', label: 'Offline' },
  warning: { dot: 'bg-warn', text: 'text-warn', label: 'Warning' },
  never: { dot: 'bg-zinc-400', text: 'text-zinc-500', label: 'Never seen' },
  revoked: { dot: 'bg-zinc-400', text: 'text-zinc-500', label: 'Revoked' },
  demo: { dot: 'bg-accent', text: 'text-accent', label: 'Demo' },
};

export function StatusDot({ status = 'never', label }) {
  const s = STATUS[status] ?? STATUS.never;
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
      {label ?? s.label}
    </span>
  );
}

const MESSAGE_STATUS = {
  pending: ['Pending', 'text-zinc-500 bg-zinc-500/10'],
  sent: ['Sent', 'text-accent bg-accent/10'],
  delivered: ['Delivered', 'text-ok bg-ok/10'],
  failed: ['Failed', 'text-emergency bg-emergency/10'],
};

export function MessageStatus({ status }) {
  const [label, classes] = MESSAGE_STATUS[status] ?? MESSAGE_STATUS.pending;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{label}</span>;
}

export function Card({ className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-black/5 bg-white/80 p-5 shadow-soft backdrop-blur-xl transition duration-300 dark:border-white/10 dark:bg-zinc-900/70 ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-accent text-white hover:brightness-110',
    ghost: 'bg-black/5 text-zinc-800 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15',
  };
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Empty({ title, children }) {
  return (
    <div className="py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-black/5 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm transition duration-200 ${
            value === o.value
              ? 'bg-white text-zinc-900 shadow-soft dark:bg-zinc-700 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 dark:border-white/10 dark:bg-zinc-800';
