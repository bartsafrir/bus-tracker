const API_BASE = 'https://open-bus-stride-api.hasadna.org.il';

export async function apiFetch<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } finally { clearTimeout(t); }
}
