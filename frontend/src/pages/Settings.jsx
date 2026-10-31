import { useState } from 'react';
import { useSettings } from '../lib/SettingsContext.jsx';
import { useData } from '../lib/DataContext.jsx';
import { API_BASE, api } from '../lib/api.js';
import { Button, Card, Empty, Segmented, StatusDot, inputClass } from '../components/ui.jsx';

function Section({ title, children }) {
  return (
    <Card>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </Card>
  );
}

export default function Settings() {
  const { mode, theme, operatorKey, operatorName, update, setOperatorKey } = useSettings();
  const { devices, connection, isDemo } = useData();
  const [keyDraft, setKeyDraft] = useState(operatorKey);
  const [health, setHealth] = useState(null);

  const checkApi = async () => {
    setHealth({ state: 'checking' });
    try {
      await api('/health');
      setHealth({ state: 'ok', message: 'Backend reachable' });
    } catch (err) {
      setHealth({ state: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Appearance">
        <Segmented
          value={theme}
          onChange={(v) => update({ theme: v })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </Section>

      <Section title="Mode">
        <Segmented
          value={mode}
          onChange={(v) => update({ mode: v })}
          options={[
            { value: 'demo', label: 'Demo' },
            { value: 'live', label: 'Live hardware' },
          ]}
        />
        <p className="mt-3 text-sm text-zinc-500">
          {isDemo
            ? 'Demo runs a simulation in this browser only. Nothing is sent to the backend or to any hardware.'
            : 'Live mode reads and sends through the SkyBridge backend. Devices show Online only after a valid heartbeat.'}
        </p>
      </Section>

      <Section title="Operator access">
        <p className="mb-3 text-sm text-zinc-500">
          Enter the operator key to read live data. It is kept only for this browser session and is never stored on the server or in code.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="Operator key"
            autoComplete="off"
            className={`${inputClass} max-w-xs`}
          />
          <Button onClick={() => setOperatorKey(keyDraft.trim())}>Save</Button>
          {operatorKey && (
            <Button
              variant="ghost"
              onClick={() => {
                setKeyDraft('');
                setOperatorKey('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Section>

      <Section title="Connection">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">API</dt>
            <dd className="mt-1 break-all font-mono text-[13px]">{API_BASE}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Real-time socket</dt>
            <dd className="mt-1">
              <StatusDot
                status={isDemo ? 'demo' : connection.state === 'connected' ? 'online' : connection.state === 'error' ? 'offline' : 'warning'}
                label={isDemo ? 'Not used in demo' : connection.state}
              />
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex items-center gap-3">
          <Button variant="ghost" onClick={checkApi}>Test API connection</Button>
          {health?.state === 'checking' && <span className="text-sm text-zinc-500">Checking…</span>}
          {health?.state === 'ok' && <StatusDot status="online" label={health.message} />}
          {health?.state === 'error' && <StatusDot status="offline" label={health.message} />}
        </div>
        {connection.error && !isDemo && <p className="mt-3 text-sm text-warn">{connection.error}</p>}
      </Section>

      <Section title="Device configuration">
        {devices.length === 0 ? (
          <Empty title="No devices" />
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {devices.map((d) => (
              <li key={d.deviceId} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="font-mono text-xs text-zinc-500">
                    {d.deviceId} · Team {d.team}
                  </p>
                </div>
                <StatusDot status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Register a device">
        <p className="mb-3 text-sm text-zinc-500">
          Devices are registered from the backend terminal with the admin key. The token is shown once. Copy it into the ESP32 sketch.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-black/5 p-4 text-xs dark:bg-white/10">
{`cd backend
ADMIN_API_KEY=your-admin-key node scripts/register-device.js "Team A Node" A
ADMIN_API_KEY=your-admin-key node scripts/register-device.js "Team B Node" B`}
        </pre>
      </Section>

      <Section title="Account">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-500">Operator name</span>
          <input
            value={operatorName}
            onChange={(e) => update({ operatorName: e.target.value.slice(0, 40) })}
            placeholder="Shown on this device only"
            className={`${inputClass} max-w-xs`}
          />
        </label>
      </Section>

      <Section title="System information">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">App version</dt>
            <dd className="mt-1">1.0.0</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Current mode</dt>
            <dd className="mt-1">{isDemo ? 'Demo (simulated)' : 'Live hardware'}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Time zone</dt>
            <dd className="mt-1">{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
