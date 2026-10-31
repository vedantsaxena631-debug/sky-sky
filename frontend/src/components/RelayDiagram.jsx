const BORDER = {
  online: 'border-ok',
  offline: 'border-emergency',
  warning: 'border-warn',
  never: 'border-zinc-300 dark:border-zinc-700',
  demo: 'border-accent',
};

const TEXT = {
  online: 'text-ok',
  offline: 'text-emergency',
  warning: 'text-warn',
  never: 'text-zinc-500',
  demo: 'text-accent',
};

function Node({ title, status, subtitle }) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 bg-white/70 px-3 py-4 transition duration-300 dark:bg-zinc-900/60 ${BORDER[status] ?? BORDER.never}`}
    >
      <span className={`text-xs font-semibold tracking-widest ${TEXT[status] ?? TEXT.never}`}>{title}</span>
      <span className="max-w-full truncate text-xs text-zinc-500">{subtitle}</span>
    </div>
  );
}

const Arrow = () => <span className="select-none text-lg text-zinc-400">→</span>;

/** TEAM A → RELAY → TEAM B. Green connected, red disconnected, orange warning. */
export default function RelayDiagram({ teamA, teamB, relay }) {
  return (
    <div className="flex items-center justify-between gap-2 md:gap-4">
      <Node title="TEAM A" status={teamA.status} subtitle={teamA.label} />
      <Arrow />
      <Node title="RELAY" status={relay.status} subtitle={relay.label} />
      <Arrow />
      <Node title="TEAM B" status={teamB.status} subtitle={teamB.label} />
    </div>
  );
}
