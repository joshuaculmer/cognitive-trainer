import { useEffect, useRef, useState } from "react";
import { UsagePage } from "../UsagePage/UsagePage";
import type {
  LogicTrainerSession,
  Message,
} from "../../trainers/logic-trainer/useLogicTrainerSession";
import "./DocumentView.css";

interface Props {
  session: LogicTrainerSession;
  onStartNew: () => void;
  onChangeKey: () => void;
}

export function DocumentView({ session, onStartNew, onChangeKey }: Props) {
  const [tab, setTab] = useState<"chat" | "usage">("chat");
  const [leftPct, setLeftPct] = useState(() => {
    const saved = localStorage.getItem("doc_divider_pct");
    return saved ? parseFloat(saved) : 60;
  });
  const agentBottomRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    agentBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;

    function onMouseMove(ev: MouseEvent) {
      if (!dragging.current || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const raw = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(raw, 20), 80);
      setLeftPct(clamped);
      localStorage.setItem("doc_divider_pct", String(clamped));
    }

    function onMouseUp() {
      dragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  const agentMessages = session.messages.filter(
    (m: Message) => m.sender === "agent",
  );

  return (
    <div className="doc-root">
      <header className="doc-header">
        <div className="doc-header-left">
          <button
            className={`doc-tab-btn${tab === "chat" ? " active" : ""}`}
            onClick={() => setTab("chat")}
          >
            Logic Trainer
          </button>
          <button
            className={`doc-tab-btn${tab === "usage" ? " active" : ""}`}
            onClick={() => setTab("usage")}
          >
            Usage
          </button>
        </div>
        <div className="doc-header-right">
          {tab === "chat" && (
            <>
              <button
                className="doc-secondary-btn"
                onClick={session.downloadTranscript}
                disabled={session.transcriptIsEmpty}
              >
                Download
              </button>
              <button className="doc-secondary-btn" onClick={onChangeKey}>
                API Key
              </button>
              <button className="doc-end-btn" onClick={onStartNew}>
                New Session
              </button>
            </>
          )}
          {tab === "usage" && (
            <button className="doc-secondary-btn" onClick={session.clearUsage}>
              Clear
            </button>
          )}
        </div>
      </header>

      {tab === "chat" ? (
        <div className="doc-body" ref={bodyRef}>

          {/* Left panel: agent messages (anti-waterfall) */}
          <div className="doc-left" style={{ width: `${leftPct}%` }}>
            <div className="doc-spacer" />
            {agentMessages.length === 0 && !session.sessionDone && (
              <p className="doc-empty">Starting session…</p>
            )}
            {agentMessages.map((msg: Message, i: number) => (
              <div key={msg.id} className="doc-agent-msg">
                {i > 0 && <div className="doc-msg-divider" />}
                <span className="doc-label">Logic Trainer</span>
                <p>{msg.text}</p>
              </div>
            ))}
            {session.sessionDone && (
              <div className="doc-session-done">
                Session complete — start a new session to continue.
              </div>
            )}
            {session.statusText && (
              <div className="doc-status-bar">
                <span className="doc-status-dot" />
                {session.statusText}
              </div>
            )}
            <div ref={agentBottomRef} />
          </div>

          {/* Draggable divider */}
          <div className="doc-panel-divider" onMouseDown={handleDividerMouseDown} />

          {/* Right panel: input only */}
          <div className="doc-right">
            <div className="doc-input-area">
              <textarea
                value={session.input}
                onChange={(e) => session.setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    session.submit();
                  }
                }}
                placeholder={
                  session.waitingForInput
                    ? "Draft your document (Ctrl+Enter to send)"
                    : "Waiting for agent…"
                }
                disabled={!session.waitingForInput}
              />
              <button
                onClick={() => session.submit()}
                disabled={!session.waitingForInput || !session.input.trim()}
              >
                Critique
              </button>
            </div>
          </div>

        </div>
      ) : (
        <UsagePage version={session.usageVersion} />
      )}
    </div>
  );
}
