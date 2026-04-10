import { useEffect, useRef, useState } from 'react'
import { UsagePage } from '../UsagePage/UsagePage'
import type { LogicTrainerSession, Message } from '../../trainers/logic-trainer/useLogicTrainerSession'
import './ChatView.css'

interface Props {
  session: LogicTrainerSession
  onStartNew: () => void
  onChangeKey: () => void
}

export function ChatView({ session, onStartNew, onChangeKey }: Props) {
  const [tab, setTab] = useState<'chat' | 'usage'>('chat')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    session.setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    session.submit()
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
                onClick={session.downloadTranscript}
                disabled={session.transcriptIsEmpty}
              >
                Download
              </button>
              <button className="secondary-btn" onClick={onChangeKey}>
                API Key
              </button>
              <button className="end-btn" onClick={onStartNew}>
                New Session
              </button>
            </>
          )}
          {tab === 'usage' && (
            <button className="secondary-btn" onClick={session.clearUsage}>
              Clear
            </button>
          )}
        </div>
      </header>

      {tab === 'chat' ? (
        <>
          <main className="message-list">
            {session.messages.length === 0 && !session.sessionDone && (
              <p className="empty">Starting session…</p>
            )}
            {session.messages.map((msg: Message) => (
              <div key={msg.id} className={`bubble ${msg.sender}`}>
                <span className="label">{msg.sender === 'agent' ? 'Logic Trainer' : 'You'}</span>
                <p>{msg.text}</p>
              </div>
            ))}
            {session.sessionDone && (
              <div className="session-done">
                Session complete — start a new session to continue.
              </div>
            )}
            <div ref={bottomRef} />
          </main>

          {session.statusText && (
            <div className="status-bar">
              <span className="status-dot" />
              {session.statusText}
            </div>
          )}

          <footer className="input-row">
            <textarea
              ref={textareaRef}
              value={session.input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                session.waitingForInput
                  ? 'Type a message… (Ctrl+Enter to send)'
                  : 'Waiting for agent…'
              }
              disabled={!session.waitingForInput}
            />
            <button
              onClick={handleSend}
              disabled={!session.waitingForInput || !session.input.trim()}
            >
              Send
            </button>
          </footer>
        </>
      ) : (
        <UsagePage version={session.usageVersion} />
      )}
    </div>
  )
}
