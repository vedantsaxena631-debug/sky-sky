import { useData } from '../lib/DataContext.jsx';
import { Button, Card, Empty, MessageStatus, StatusDot } from '../components/ui.jsx';
import RelayDiagram from '../components/RelayDiagram.jsx';
import { timeAgo } from '../lib/format.js';

function Tile({ label, children }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-2 text-lg font-semibold">{children}</div>
    </Card>
  );
}

export default function Overview() {
  const { devices, messages, connection, isDemo, sendMessage } = useData();

  const teamA = devices.find((d) => d.team === 'A');
  const teamB = devices.find((d) => d.team === 'B');
  const delivered = messages.filter((m) => m.status === 'delivered').length;

  const systemStatus = isDemo
    ? 'demo'
    : { connected: 'online', connecting: 'warning', error: 'offline', idle: 'never' }[connection.state];

  // Live mode has no relay telemetry yet, so we show a warning instead of guessing.
  const relay = isDemo ? { status: 'demo', label: 'Simulated' } : { status: 'warning', label: 'No telemetry' };

  const runDemo = () => {
    if (teamA && teamB) {
      sendMessage({ fromDevice: teamA, toDevice: teamB, body: 'Demo: Team A reporting. All clear.' });
    }
  };

  return (
    <div className="space-y-6">
      {connection.error && !isDemo && (
        <Card className="border-warn/40">
          <p className="text-sm text-warn">{connection.error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Tile label="System">
          <StatusDot status={systemStatus} label={isDemo ? 'Demo' : undefined} />
        </Tile>
        <Tile label="Team A">
          <StatusDot status={teamA?.status ?? 'never'} />
        </Tile>
        <Tile label="Team B">
          <StatusDot status={teamB?.status ?? 'never'} />
        </Tile>
        <Tile label="Drone relay">
          <StatusDot status={relay.status} label={relay.label} />
        </Tile>
        <Tile label="Total messages">{messages.length}</Tile>
        <Tile label="Delivered">{delivered}</Tile>
      </div>

      <Card>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-semibold">Communication path</h2>
          {isDemo && (
            <Button variant="ghost" onClick={runDemo} disabled={!teamA || !teamB}>
              Run demo message
            </Button>
          )}
        </div>
        <RelayDiagram
          teamA={{ status: teamA?.status ?? 'never', label: teamA?.deviceId ?? 'Not registered' }}
          teamB={{ status: teamB?.status ?? 'never', label: teamB?.deviceId ?? 'Not registered' }}
          relay={relay}
        />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Recent activity</h2>
        {messages.length === 0 ? (
          <Empty title="No activity yet">Messages from Team A and Team B will appear here.</Empty>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {messages.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{m.body}</p>
                  <p className="text-xs text-zinc-500">
                    Team {m.fromTeam} → Team {m.toTeam} · {timeAgo(m.createdAt)}
                  </p>
                </div>
                <MessageStatus status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
