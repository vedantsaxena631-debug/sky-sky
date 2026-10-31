import { useState } from 'react';
import { useData } from '../lib/DataContext.jsx';
import { Empty, MessageStatus } from '../components/ui.jsx';
import { time } from '../lib/format.js';

export default function Messages() {
  const { devices, messages, sendMessage } = useData();
  const [senderTeam, setSenderTeam] = useState('A');
  const [recipientId, setRecipientId] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const sender = devices.find((d) => d.team === senderTeam);
  const recipients = devices.filter((d) => d.team !== senderTeam);
  const recipient = recipients.find((d) => d.deviceId === recipientId) ?? recipients[0];
  const thread = messages.slice().reverse();

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (!sender || !recipient) {
      setError('Register both Team A and Team B devices first.');
      return;
    }
    try {
      await sendMessage({ fromDevice: sender, toDevice: recipient, body });
      setText('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/80 shadow-soft md:h-[70vh] dark:border-white/10 dark:bg-zinc-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-3 dark:border-white/10">
        <div>
          <p className="font-semibold">Team A ↔ Team B</p>
          <p className="text-xs text-zinc-500">Relay channel</p>
        </div>
        <div className="inline-flex rounded-full bg-black/5 p-1 text-sm dark:bg-white/10">
          {['A', 'B'].map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => setSenderTeam(team)}
              className={`rounded-full px-3 py-1 transition duration-200 ${
                senderTeam === team ? 'bg-white text-zinc-900 shadow-soft dark:bg-zinc-700 dark:text-white' : 'text-zinc-500'
              }`}
            >
              Send as Team {team}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.length === 0 ? (
          <Empty title="No messages yet">Messages you send will appear here.</Empty>
        ) : (
          thread.map((m) => {
            const mine = m.fromTeam === senderTeam;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[75%] break-words rounded-2xl px-4 py-2 text-sm shadow-soft ${
                    mine
                      ? 'rounded-br-md bg-accent text-white'
                      : 'rounded-bl-md bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  }`}
                >
                  {m.body}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>{time(m.createdAt)}</span>
                  {mine && <MessageStatus status={m.status} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={submit} className="border-t border-black/5 p-3 dark:border-white/10">
        {error && <p className="mb-2 px-3 text-xs text-emergency">{error}</p>}
        <div className="flex items-center gap-2">
          <select
            value={recipient?.deviceId ?? ''}
            onChange={(e) => setRecipientId(e.target.value)}
            disabled={!recipients.length}
            className="max-w-[9rem] rounded-full bg-black/5 px-3 py-2 text-xs outline-none dark:bg-white/10 dark:text-zinc-100"
          >
            {recipients.length ? (
              recipients.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.name}
                </option>
              ))
            ) : (
              <option>No device</option>
            )}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={240}
            placeholder="Message"
            className="flex-1 rounded-full bg-black/5 px-4 py-2 text-sm outline-none transition focus:ring-4 focus:ring-accent/15 dark:bg-white/10"
          />
          <button
            type="submit"
            disabled={!text.trim() || !sender || !recipient}
            aria-label="Send"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white transition duration-200 active:scale-95 disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
