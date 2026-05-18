interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * iso-codes MCP — lookups against the Debian iso-codes project JSON.
 *
 * Cached 24h in-worker.
 */


const URLS = {
  countries: 'https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/main/data/iso_3166-1.json',
  subdivisions: 'https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/main/data/iso_3166-2.json',
  languages: 'https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/main/data/iso_639-3.json',
  currencies: 'https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/main/data/iso_4217.json',
  scripts: 'https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/main/data/iso_15924.json',
};

const UA = 'pipeworx-mcp-iso-codes/1.0 (+https://pipeworx.io)';
const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE: Record<string, { at: number; data: unknown }> = {};

const tools: McpToolExport['tools'] = [
  { name: 'country', description: 'Country by name / alpha-2 / alpha-3 / numeric.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'subdivisions', description: 'ISO 3166-2 subdivisions of a country.', inputSchema: { type: 'object', properties: { country_alpha2: { type: 'string' } }, required: ['country_alpha2'] } },
  { name: 'language', description: 'Language by name / 2-letter / 3-letter code.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'currency', description: 'Currency by name / code / numeric.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'script', description: 'Script (ISO 15924).', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'list', description: 'List all of one kind.', inputSchema: { type: 'object', properties: { kind: { type: 'string', description: 'countries | languages | currencies | scripts' }, filter: { type: 'string' } }, required: ['kind'] } },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'country':
      return matchOne(await load('countries'), reqStr(args, 'query', '"Germany"'), ['alpha_2', 'alpha_3', 'numeric', 'name', 'common_name', 'official_name']);
    case 'subdivisions': {
      const a2 = reqStr(args, 'country_alpha2', '"DE"').toUpperCase();
      const data = (await load('subdivisions')) as { '3166-2': { code: string; name: string; type: string; parent?: string }[] };
      const subs = data['3166-2'].filter((s) => s.code.startsWith(`${a2}-`));
      return { country_alpha2: a2, count: subs.length, subdivisions: subs };
    }
    case 'language':
      return matchOne(await load('languages'), reqStr(args, 'query', '"English"'), ['alpha_2', 'alpha_3', 'bibliographic', 'name', 'inverted_name']);
    case 'currency':
      return matchOne(await load('currencies'), reqStr(args, 'query', '"EUR"'), ['alpha_3', 'numeric', 'name']);
    case 'script':
      return matchOne(await load('scripts'), reqStr(args, 'query', '"Latin"'), ['alpha_4', 'numeric', 'name']);
    case 'list': {
      const kind = reqStr(args, 'kind', '"countries"');
      if (!(kind in URLS)) throw new Error(`kind must be one of: ${Object.keys(URLS).join(', ')}`);
      const data = await load(kind as keyof typeof URLS);
      const arr = entries(data);
      const filter = (args.filter as string | undefined)?.toLowerCase();
      const filtered = filter ? arr.filter((r) => JSON.stringify(r).toLowerCase().includes(filter)) : arr;
      return { kind, total: arr.length, results: filtered };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function entries(data: unknown): Record<string, unknown>[] {
  if (typeof data !== 'object' || data == null) return [];
  for (const key of ['3166-1', '3166-2', '639-3', '4217', '15924']) {
    const v = (data as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

function matchOne(data: unknown, q: string, keys: string[]): unknown {
  const lc = q.trim().toLowerCase();
  for (const r of entries(data)) {
    for (const k of keys) {
      const v = (r as Record<string, unknown>)[k];
      if (typeof v === 'string' && v.toLowerCase() === lc) return r;
    }
  }
  // Fallback: substring match on name.
  for (const r of entries(data)) {
    const name = (r as Record<string, unknown>).name;
    if (typeof name === 'string' && name.toLowerCase().includes(lc)) return r;
  }
  return null;
}

async function load(kind: keyof typeof URLS): Promise<unknown> {
  const now = Date.now();
  const c = CACHE[kind];
  if (c && now - c.at < TTL_MS) return c.data;
  const res = await fetch(URLS[kind], { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`iso-codes ${kind}: ${res.status}`);
  const data = await res.json();
  CACHE[kind] = { at: now, data };
  return data;
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
