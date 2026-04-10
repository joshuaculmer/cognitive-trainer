import { useEffect, useState } from 'react'
import { KeyGate } from './components/KeyGate/KeyGate'
import { ChatView } from './components/ChatView/ChatView'
import { useLogicTrainerSession } from './trainers/logic-trainer/useLogicTrainerSession'

const KEY_STORAGE = 'ct_openai_key'

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [keyConfirmed, setKeyConfirmed] = useState(() => !!localStorage.getItem(KEY_STORAGE))
  const session = useLogicTrainerSession()

  useEffect(() => {
    const storedKey = localStorage.getItem(KEY_STORAGE)
    if (storedKey) session.startSession(storedKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleKeySubmit(key: string) {
    localStorage.setItem(KEY_STORAGE, key)
    setKeyConfirmed(true)
    session.startSession(key)
  }

  function handleStartNew() {
    const key = localStorage.getItem(KEY_STORAGE)
    if (key) session.startSession(key)
  }

  function handleChangeKey() {
    localStorage.removeItem(KEY_STORAGE)
    session.cancelSession()
    setKeyConfirmed(false)
    setApiKey('')
  }

  if (!keyConfirmed) {
    return (
      <KeyGate
        apiKey={apiKey}
        onKeyChange={setApiKey}
        onSubmit={handleKeySubmit}
      />
    )
  }

  return (
    <ChatView
      session={session}
      onStartNew={handleStartNew}
      onChangeKey={handleChangeKey}
    />
  )
}
