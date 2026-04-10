import { useRef, useState, useCallback } from 'react'
import OpenAI from 'openai'
import { ToolBox } from '../../toolbox'
import { runAgent } from '../../runAgent'
import { agents } from './agents'
import { recordUsage, clearRecords } from '../../usage'
import { logicTrainerInitialHistory, INITIAL_CALL_ID, INITIAL_MESSAGE } from './agent_initial_history'

export interface Message {
  id: number
  sender: 'agent' | 'user'
  text: string
}

interface TranscriptEntry {
  role: string
  name?: string
  text: string
}

export interface LogicTrainerSession {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  statusText: string
  waitingForInput: boolean
  sessionDone: boolean
  usageVersion: number
  transcriptIsEmpty: boolean
  submit: () => void
  downloadTranscript: () => void
  clearUsage: () => void
  cancelSession: () => void
  startSession: (key: string) => void
}

let nextId = 0

export function useLogicTrainerSession(): LogicTrainerSession {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [statusText, setStatusText] = useState('')
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [usageVersion, setUsageVersion] = useState(0)

  const inputResolverRef = useRef<{
    resolve: (v: string) => void
    reject: (e: Error) => void
  } | null>(null)
  const sessionIdRef = useRef(0)
  const transcriptRef = useRef<TranscriptEntry[]>([])

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
      setStatusText('')
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

      // Show the opening question immediately and enable input — no API round-trip needed.
      addMessage('agent', INITIAL_MESSAGE)
      transcriptRef.current.push({ role: 'agent', name: 'main', text: INITIAL_MESSAGE })
      setWaitingForInput(true)

      // Wait for the user's first message, then seed history with the synthetic
      // first exchange and hand off to the normal runAgent loop.
      const firstMessagePromise = new Promise<string>((resolve, reject) => {
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

      const mainAgent = agents.find(a => a.name === 'main')!

      firstMessagePromise
        .then(firstMessage => {
          if (sessionId !== sessionIdRef.current) return Promise.resolve(null)
          const history = [
            ...logicTrainerInitialHistory,
            { type: 'function_call_output', call_id: INITIAL_CALL_ID, output: firstMessage },
          ]
          return runAgent(client, toolbox, mainAgent, undefined, history, onUsage)
        })
        .then(result => {
          if (result === undefined) return // session was cancelled before runAgent started
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

  const cancelSession = useCallback(() => {
    inputResolverRef.current?.reject(new Error('Session cancelled'))
    inputResolverRef.current = null
    sessionIdRef.current++
    setMessages([])
    setInput('')
    setStatusText('')
    setWaitingForInput(false)
    setSessionDone(false)
  }, [])

  function submit() {
    const text = input.trim()
    if (!text || !waitingForInput || !inputResolverRef.current) return
    addMessage('user', text)
    inputResolverRef.current.resolve(text)
    inputResolverRef.current = null
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

  function clearUsage() {
    clearRecords()
    setUsageVersion(v => v + 1)
  }

  return {
    messages,
    input,
    setInput,
    statusText,
    waitingForInput,
    sessionDone,
    usageVersion,
    transcriptIsEmpty: transcriptRef.current.length === 0,
    submit,
    downloadTranscript,
    clearUsage,
    cancelSession,
    startSession,
  }
}
