// Pricing per 1M tokens (USD). fetched March 6, 2026.
const PRICING: Record<string, { input: number; cached: number; output: number }> = {
  'gpt-5.4':             { input: 2.25,  cached: 0.225, output: 18.00  },
  'gpt-5.4-pro':         { input: 27.00, cached: 0.0,   output: 216.00 },
  'gpt-5.3-chat-latest': { input: 1.75,  cached: 0.175, output: 14.00  },
  'gpt-5.3-codex':       { input: 1.75,  cached: 0.175, output: 14.00  },
  'gpt-5.2':             { input: 1.75,  cached: 0.175, output: 14.00  },
  'gpt-5.2-chat-latest': { input: 1.75,  cached: 0.175, output: 14.00  },
  'gpt-5.2-codex':       { input: 1.75,  cached: 0.175, output: 14.00  },
  'gpt-5.2-pro':         { input: 21.00, cached: 0.0,   output: 168.00 },
  'gpt-5.1':             { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5.1-chat-latest': { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5.1-codex':       { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5.1-codex-max':   { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5':               { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5-chat-latest':   { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5-codex':         { input: 1.25,  cached: 0.125, output: 10.00  },
  'gpt-5-pro':           { input: 15.00, cached: 0.0,   output: 120.00 },
  'gpt-5-mini':          { input: 0.25,  cached: 0.025, output: 2.00   },
  'gpt-5-nano':          { input: 0.05,  cached: 0.005, output: 0.40   },
  'gpt-4.1':             { input: 2.00,  cached: 0.50,  output: 8.00   },
  'gpt-4.1-mini':        { input: 0.40,  cached: 0.10,  output: 1.60   },
  'gpt-4.1-nano':        { input: 0.10,  cached: 0.025, output: 0.40   },
}

export interface UsageRecord {
  agent: string
  model: string
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  reasoningTokens: number
  timestamp: number
}

export interface AgentSummary {
  agent: string
  model: string
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  reasoningTokens: number
  cost: number
}

export interface UsageSummary {
  byAgent: AgentSummary[]
  totalCost: number
  totalInput: number
  totalCached: number
  totalOutput: number
  totalReasoning: number
}

const STORAGE_KEY = 'ct_usage'

export function recordUsage(record: UsageRecord): void {
  const records = loadRecords()
  records.push(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function loadRecords(): UsageRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as UsageRecord[]
  } catch {
    return []
  }
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function tokenCost(model: string, input: number, cached: number, output: number): number {
  const rates = PRICING[model]
  if (!rates) return 0
  return (input * rates.input + cached * rates.cached + output * rates.output) / 1_000_000
}

export function summarize(records: UsageRecord[]): UsageSummary {
  const map = new Map<string, AgentSummary>()

  for (const r of records) {
    const key = `${r.agent}::${r.model}`
    const existing = map.get(key) ?? {
      agent: r.agent,
      model: r.model,
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cost: 0,
    }
    existing.inputTokens += r.inputTokens
    existing.cachedTokens += r.cachedTokens
    existing.outputTokens += r.outputTokens
    existing.reasoningTokens += r.reasoningTokens
    existing.cost = tokenCost(existing.model, existing.inputTokens, existing.cachedTokens, existing.outputTokens)
    map.set(key, existing)
  }

  const byAgent = [...map.values()]
  return {
    byAgent,
    totalCost:      byAgent.reduce((s, a) => s + a.cost, 0),
    totalInput:     byAgent.reduce((s, a) => s + a.inputTokens, 0),
    totalCached:    byAgent.reduce((s, a) => s + a.cachedTokens, 0),
    totalOutput:    byAgent.reduce((s, a) => s + a.outputTokens, 0),
    totalReasoning: byAgent.reduce((s, a) => s + a.reasoningTokens, 0),
  }
}
