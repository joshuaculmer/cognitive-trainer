import { useEffect, useRef, useState, useCallback } from 'react'
import OpenAI from 'openai'
import './App.css'
import { ToolBox } from './toolbox'
import { runAgent } from './runAgent'
import { agents } from './agents'
import { recordUsage, clearRecords } from './usage'
import { UsagePage } from './UsagePage'

interface Message {
  id: number
  sender: 'agent' | 'user'
  text: string
}

interface TranscriptEntry {
  role: string
  name?: string
  text: string
}

const KEY_STORAGE = 'ct_openai_key'
let nextId = 0

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [keyConfirmed, setKeyConfirmed] = useState(() => !!localStorage.getItem(KEY_STORAGE))
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [statusText, setStatusText] = useState('')
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [tab, setTab] = useState<'chat' | 'usage'>('chat')
  const [usageVersion, setUsageVersion] = useState(0)

  const inputResolverRef = useRef<{
    resolve: (v: string) => void
    reject: (e: Error) => void
  } | null>(null)
  const sessionIdRef = useRef(0)
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const addMessage = useCallback((sender: 'agent' | 'user', text: string) => {
    setMessages(prev => [...prev, { id: nextId++, sender, text }])
  }, [])

  const onUsage = useCallback((agentName: string, model: string, usage: unknown) => {
    const u = usage as {
      input_tokens?: number
      input_tokens_details?: { cached_tokens?: number }
      output_tokens?: number
      output_tokens_details?: { reasoning_tokens?: number }
    }
    recordUsage({
      agent: agentName,
      model,
      inputTokens: u?.input_tokens ?? 0,
      cachedTokens: u?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      reasoningTokens: u?.output_tokens_details?.reasoning_tokens ?? 0,
      timestamp: Date.now(),
    })
    setUsageVersion(v => v + 1)
  }, [])

  const startSession = useCallback(
    (key: string) => {
      inputResolverRef.current?.reject(new Error('Session cancelled'))
      inputResolverRef.current = null

      const sessionId = ++sessionIdRef.current
      transcriptRef.current = []
      setMessages([])
      setInput('')
      setStatusText('Starting…')
      setWaitingForInput(false)
      setSessionDone(false)

      const client = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true })
      const toolbox = new ToolBox()

      toolbox.register(
        {
          name: 'conclude',
          description: 'Conclude the conversation.',
          parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
          strict: true,
        },
        async () => '',
      )

      toolbox.register(
        {
          name: 'talk_to_user',
          description:
            'Use this function to communicate with the user. All communication to and from the user MUST be through this tool.',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'The message to send to the user.' },
            },
            required: ['message'],
            additionalProperties: false,
          },
          strict: true,
        },
        async ({ message }: { message: string }) => {
          if (sessionId !== sessionIdRef.current) throw new Error('Session cancelled')
          addMessage('agent', String(message))
          transcriptRef.current.push({ role: 'agent', name: 'main', text: String(message) })
          setStatusText('')
          setWaitingForInput(true)
          return new Promise<string>((resolve, reject) => {
            inputResolverRef.current = {
              resolve: text => {
                if (sessionId !== sessionIdRef.current) return
                transcriptRef.current.push({ role: 'user', text })
                setWaitingForInput(false)
                setStatusText('Thinking…')
                resolve(text)
              },
              reject,
            }
          })
        },
      )

      toolbox.register(
        {
          name: 'send_message_to_user',
          description: 'Send a one-way message to the user without waiting for a response.',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'The message to send.' },
            },
            required: ['message'],
            additionalProperties: false,
          },
          strict: true,
        },
        async ({ message }: { message: string }) => {
          if (sessionId !== sessionIdRef.current) return ''
          addMessage('agent', String(message))
          transcriptRef.current.push({ role: 'agent', name: 'main', text: String(message) })
          return ''
        },
      )

      const daAgent = agents.find(a => a.name === 'devils-advocate')!
      toolbox.register(
        {
          name: 'devils-advocate',
          description:
            daAgent.description ??
            'Finds counter arguments, logical fallacies, holes in logic, and weak premises.',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'The argument to analyze.' },
            },
            required: ['input'],
            additionalProperties: false,
          },
          strict: true,
        },
        async ({ input: argInput }: { input: string }) => {
          if (sessionId !== sessionIdRef.current) return ''
          setStatusText('Finding arguments…')
          const result = await runAgent(client, toolbox, daAgent, String(argInput), [], onUsage)
          if (sessionId === sessionIdRef.current) setStatusText('Revising…')
          return result ?? ''
        },
      )

      const mainAgent = agents.find(a => a.name === 'main')!
      runAgent(client, toolbox, mainAgent, undefined, [], onUsage)
        .then(() => {
          if (sessionId !== sessionIdRef.current) return
          setStatusText('')
          setWaitingForInput(false)
          setSessionDone(true)
        })
        .catch((err: Error) => {
          if (err.message === 'Session cancelled') return
          if (sessionId !== sessionIdRef.current) return
          console.error('Agent error:', err)
          addMessage('agent', `Error: ${err.message}. Check your API key or the console for details.`)
          setStatusText('')
          setWaitingForInput(false)
        })
    },
    [addMessage, onUsage],
  )

  useEffect(() => {
    const storedKey = localStorage.getItem(KEY_STORAGE)
    if (storedKey) startSession(storedKey)
  }, [startSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = apiKey.trim()
    if (!trimmed) return
    localStorage.setItem(KEY_STORAGE, trimmed)
    setKeyConfirmed(true)
    startSession(trimmed)
  }

  function submit() {
    const text = input.trim()
    if (!text || !waitingForInput || !inputResolverRef.current) return
    addMessage('user', text)
    inputResolverRef.current.resolve(text)
    inputResolverRef.current = null
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }

  function handleStartNew() {
    const key = localStorage.getItem(KEY_STORAGE)
    if (key) startSession(key)
  }

  function downloadTranscript() {
    if (transcriptRef.current.length === 0) return
    const blob = new Blob([JSON.stringify(transcriptRef.current, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logic-trainer-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function changeKey() {
    localStorage.removeItem(KEY_STORAGE)
    inputResolverRef.current?.reject(new Error('Session cancelled'))
    inputResolverRef.current = null
    sessionIdRef.current++
    setKeyConfirmed(false)
    setApiKey('')
    setMessages([])
    setStatusText('')
    setWaitingForInput(false)
    setSessionDone(false)
  }

  if (!keyConfirmed) {
    return (
      <div className="key-gate">
        <div className="key-card">
          <h1>Cognitive Trainer</h1>
          <p className="key-subtitle">Logic Trainer</p>
          <form onSubmit={handleKeySubmit} className="key-form">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
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

  return (
    <div className="chat-root">
      <header className="chat-header">
        <div className="header-left">
          <button
            className={`tab-btn${tab === 'chat' ? ' active' : ''}`}
            onClick={() => setTab('chat')}
          >
            Logic Trainer
          </button>
          <button
            className={`tab-btn${tab === 'usage' ? ' active' : ''}`}
            onClick={() => setTab('usage')}
          >
            Usage
          </button>
        </div>
        <div className="header-right">
          {tab === 'chat' && (
            <>
              <button
                className="secondary-btn"
                onClick={downloadTranscript}
                disabled={transcriptRef.current.length === 0}
              >
                Download
              </button>
              <button className="secondary-btn" onClick={changeKey}>
                API Key
              </button>
              <button className="end-btn" onClick={handleStartNew}>
                New Session
              </button>
            </>
          )}
          {tab === 'usage' && (
            <button
              className="secondary-btn"
              onClick={() => { clearRecords(); setUsageVersion(v => v + 1) }}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {tab === 'chat' ? (
        <>
          <main className="message-list">
            {messages.length === 0 && !sessionDone && (
              <p className="empty">Starting session…</p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`bubble ${msg.sender}`}>
                <span className="label">{msg.sender === 'agent' ? 'Logic Trainer' : 'You'}</span>
                <p>{msg.text}</p>
              </div>
            ))}
            {sessionDone && (
              <div className="session-done">
                Session complete — start a new session to continue.
              </div>
            )}
            <div ref={bottomRef} />
          </main>

          {statusText && (
            <div className="status-bar">
              <span className="status-dot" />
              {statusText}
            </div>
          )}

          <footer className="input-row">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                waitingForInput ? 'Type a message… (Ctrl+Enter to send)' : 'Waiting for agent…'
              }
              disabled={!waitingForInput}
            />
            <button onClick={submit} disabled={!waitingForInput || !input.trim()}>
              Send
            </button>
          </footer>
        </>
      ) : (
        <UsagePage version={usageVersion} />
      )}
    </div>
  )
}
