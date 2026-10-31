import { useState } from 'react';
import { useData } from '../lib/DataContext.jsx';
import { Button, Card, Empty, MessageStatus, StatusDot, inputClass } from '../components/ui.jsx';
import { time, timeAgo } from '../lib/format.js';

function Info({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`mt-1 font-medium ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}

export default function TeamPage({ team }) {
  const { devices, messages, isDemo, sendMessage } = useData();
  const otherTeam = team === 'A' ? 'B' : 'A';
  const device = devices.find((d) => d.team === team);
  const target = devices.find((d) => d.team === otherTeam);

  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const history = messages.filter((m) => m.fromTeam === team || m.toTeam === team).slice().reverse();
  const incoming = messages.filter((m) => m.toTeam === team && m.status !== 'delivered');

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (!device || !target) {
      setError('Both Team A and Team B devices must be registered.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendMessage({ fromDevice: device, toDevice: target, body });
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-zinc-500">Team {team} device{isDemo && ' · demo'}</p>
              <h2 className="mt-1 truncate text-xl font-semibold">{device?.name ?? 'Not registered'}</h2>
            </div>
            <StatusDot status={device?.status ?? 'never'} />
          </div>

          {device ? (
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <Info label="Device ID" value={device.deviceId} mono />
              <Info label="Last seen" value={timeAgo(device.lastSeen)} />
              <Info label="Signal (RSSI)" value={device.rssi != null ? `${device.rssi} dBm` : 'Not reported'} />
              <Info label="SNR" value={device.snr != null ? `${device.snr} dB` : 'Not reported'} />
            </dl>
          ) : (
            <Empty title="No device registered">
              Register this team's node from the terminal. See Settings → Register a device.
            </Empty>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold">{team === 'A' ? 'Send message' : 'Reply to Team A'}</h3>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <textarea
              rows={3}
              maxLength={240}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message to ${target?.name ?? `Team ${otherTeam}`}`}
              className={inputClass}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{text.length}/240</span>
              <Button type="submit" disabled={sending || !text.trim() || !device || !target}>
                {sending ? 'Sending…' : team === 'A' ? 'Send' : 'Reply'}
              </Button>
            </div>
            {error && <p className="text-sm text-emergency">{error}</p>}
          </form>
        </Card>
      </div>

      {team === 'B' && (
        <Card>
          <h3 className="font-semibold">Incoming</h3>
          {incoming.length === 0 ? (
            <Empty title="Nothing waiting">Messages that have not reached Team B yet appear here.</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
              {incoming.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm">{m.body}</p>
                    <p className="mt-1 text-xs text-zinc-500">From {m.from} · {time(m.createdAt)}</p>
                  </div>
                  <MessageStatus status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <h3 className="font-semibold">History</h3>
        {history.length === 0 ? (
          <Empty title="No messages yet" />
        ) : (
          <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
            {history.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">
                    {m.from} → {m.to} · {time(m.createdAt)}
                  </p>
                  <p className="mt-1 break-words text-sm">{m.body}</p>
                  {m.failedReason && <p className="mt-1 text-xs text-emergency">{m.failedReason}</p>}
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
