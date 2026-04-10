import { useMemo } from 'react'
import { loadRecords, summarize } from '../../usage'
import './UsagePage.css'

interface Props {
  version: number
}

export function UsagePage({ version }: Props) {
  const summary = useMemo(() => summarize(loadRecords()), [version])

  if (summary.byAgent.length === 0) {
    return (
      <div className="usage-page">
        <p className="usage-empty">No usage recorded yet. Start a session to track token usage and costs.</p>
      </div>
    )
  }

  return (
    <div className="usage-page">
      <table className="usage-table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Model</th>
            <th className="num">Input</th>
            <th className="num">Cached</th>
            <th className="num">Output</th>
            <th className="num">Reasoning</th>
            <th className="num">Cost (USD)</th>
          </tr>
        </thead>
        <tbody>
          {summary.byAgent.map(s => (
            <tr key={`${s.agent}::${s.model}`}>
              <td>{s.agent}</td>
              <td className="mono">{s.model}</td>
              <td className="num">{s.inputTokens.toLocaleString()}</td>
              <td className="num">{s.cachedTokens.toLocaleString()}</td>
              <td className="num">{s.outputTokens.toLocaleString()}</td>
              <td className="num">{s.reasoningTokens.toLocaleString()}</td>
              <td className="num cost-cell">${s.cost.toFixed(6)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="usage-totals-row">
            <td colSpan={2}>Total</td>
            <td className="num">{summary.totalInput.toLocaleString()}</td>
            <td className="num">{summary.totalCached.toLocaleString()}</td>
            <td className="num">{summary.totalOutput.toLocaleString()}</td>
            <td className="num">{summary.totalReasoning.toLocaleString()}</td>
            <td className="num cost-cell">${summary.totalCost.toFixed(6)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="usage-note">Prices per 1M tokens — updated March 2026.</p>
    </div>
  )
}
