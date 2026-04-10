import './KeyGate.css'

interface Props {
  apiKey: string
  onKeyChange: (key: string) => void
  onSubmit: (key: string) => void
}

export function KeyGate({ apiKey, onKeyChange, onSubmit }: Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = apiKey.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div className="key-gate">
      <div className="key-card">
        <h1>Cognitive Trainer</h1>
        <p className="key-subtitle">Logic Trainer</p>
        <form onSubmit={handleSubmit} className="key-form">
          <input
            type="password"
            value={apiKey}
            onChange={e => onKeyChange(e.target.value)}
            placeholder="sk-..."
            autoFocus
          />
          <button type="submit" disabled={!apiKey.trim()}>
            Start
          </button>
        </form>
        <p className="key-note">
          Your key is stored in localStorage and sent only to OpenAI.
        </p>
      </div>
    </div>
  )
}
