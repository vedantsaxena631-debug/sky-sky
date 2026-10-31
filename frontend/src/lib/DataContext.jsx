import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './SettingsContext.jsx';
import { api } from './api.js';
import { connectOperatorSocket } from './socket.js';
import { DEMO_DEVICES, makeDemoMessage } from './demo.js';

const DataContext = createContext(null);

/** Insert or update an item by key. Used for socket events. */
function upsert(list, item, key, prepend = false) {
  const index = list.findIndex((x) => x[key] === item[key]);
  if (index === -1) return prepend ? [item, ...list] : [...list, item];
  const next = [...list];
  next[index] = { ...next[index], ...item };
  return next;
}

export function DataProvider({ children }) {
  const { mode, operatorKey } = useSettings();
  const isDemo = mode === 'demo';

  const [devices, setDevices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connection, setConnection] = useState({ state: 'idle', error: null });
  const timers = useRef([]);

  // Demo mode: local simulation only.
  useEffect(() => {
    if (!isDemo) return undefined;
    setDevices(DEMO_DEVICES);
    setMessages([]);
    setConnection({ state: 'idle', error: null });
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [isDemo]);

  // Live mode: initial load plus real-time socket updates.
  useEffect(() => {
    if (isDemo) return undefined;

    if (!operatorKey) {
      setDevices([]);
      setMessages([]);
      setConnection({ state: 'error', error: 'Add the operator key in Settings to connect to the live backend.' });
      return undefined;
    }

    let active = true;
    setConnection({ state: 'connecting', error: null });

    Promise.all([api('/devices', { operatorKey }), api('/messages?limit=100', { operatorKey })])
      .then(([deviceList, messageList]) => {
        if (!active) return;
        setDevices(deviceList);
        setMessages(messageList);
        setConnection({ state: 'connected', error: null });
      })
      .catch((err) => {
        if (active) setConnection({ state: 'error', error: err.message });
      });

    const socket = connectOperatorSocket(operatorKey);
    socket.on('connect', () => {
      if (active) setConnection({ state: 'connected', error: null });
    });
    socket.on('disconnect', () => {
      if (active) setConnection((c) => ({ ...c, state: 'connecting' }));
    });
    socket.on('connect_error', (err) => {
      if (active) setConnection({ state: 'error', error: err.message });
    });
    socket.on('device:update', (device) => {
      if (active) setDevices((prev) => upsert(prev, device, 'deviceId'));
    });
    socket.on('message:new', (message) => {
      if (active) setMessages((prev) => upsert(prev, message, 'id', true));
    });
    socket.on('message:update', (message) => {
      if (active) setMessages((prev) => upsert(prev, message, 'id'));
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [isDemo, operatorKey]);

  const sendMessage = useCallback(
    async ({ fromDevice, toDevice, body }) => {
      if (isDemo) {
        const message = makeDemoMessage(fromDevice, toDevice, body);
        setMessages((prev) => [message, ...prev]);

        const advance = (status, delay) => {
          timers.current.push(
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === message.id
                    ? {
                        ...m,
                        status,
                        deliveredAt: status === 'delivered' ? new Date().toISOString() : m.deliveredAt,
                      }
                    : m,
                ),
              );
            }, delay),
          );
        };
        advance('sent', 900);
        advance('delivered', 2400);
        return message;
      }

      const message = await api('/messages/send', {
        method: 'POST',
        operatorKey,
        body: { from: fromDevice.deviceId, to: toDevice.deviceId, body },
      });
      setMessages((prev) => upsert(prev, message, 'id', true));
      return message;
    },
    [isDemo, operatorKey],
  );

  const value = useMemo(
    () => ({ devices, messages, connection, isDemo, sendMessage }),
    [devices, messages, connection, isDemo, sendMessage],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
