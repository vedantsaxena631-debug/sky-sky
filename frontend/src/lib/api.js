export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Calls the SkyBridge API. The operator key is sent as a header, never in the URL.
 * Device tokens never reach the browser.
 */
export async function api(path, { method = 'GET', body, operatorKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (operatorKey) headers['x-operator-key'] = operatorKey;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
}
