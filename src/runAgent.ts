import type OpenAI from 'openai'
import type { ToolBox } from './toolbox'
import type { Agent } from './agents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = Record<string, any>

export async function runAgent(
  client: OpenAI,
  toolbox: ToolBox,
  agent: Agent,
  userMessage?: string,
  history: AnyItem[] = [],
  onUsage?: (agentName: string, model: string, usage: unknown) => void,
): Promise<string | null> {
  if (userMessage) {
    history.push({ role: 'user', content: userMessage })
  }

  while (true) {
    const input: AnyItem[] = agent.prompt
      ? [...history, { role: 'system', content: agent.prompt }]
      : [...history]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.responses as any).create({
      input,
      model: agent.model ?? 'gpt-4o-mini',
      tools: toolbox.getSchemas(agent.tools ?? []),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (onUsage && (response as any).usage) onUsage(agent.name, agent.model ?? 'gpt-4o-mini', (response as any).usage)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: AnyItem[] = (response as any).output ?? []
    history.push(...output)

    // Direct text message → done
    const textItems = output.filter(item => item.type === 'message')
    if (textItems.length > 0) {
      return textItems
        .map(item =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item.content as any[]).map((c: any) => c.text ?? '').join(''),
        )
        .join('\n')
    }

    // Tool calls
    const toolCalls = output.filter(item => item.type === 'function_call')
    if (toolCalls.length === 0) break

    let shouldConclude = false

    const results = await Promise.all(
      toolCalls.map(async item => {
        if (item.name === 'conclude') {
          shouldConclude = true
          return { callId: item.call_id as string, output: '' }
        }
        const args = JSON.parse(item.arguments as string) as Record<string, unknown>
        const result = await toolbox.run(item.name as string, args)
        return { callId: item.call_id as string, output: result }
      }),
    )

    for (const { callId, output: toolOutput } of results) {
      history.push({
        type: 'function_call_output',
        call_id: callId,
        output: toolOutput,
      })
    }

    if (shouldConclude) return null
  }

  return null
}
