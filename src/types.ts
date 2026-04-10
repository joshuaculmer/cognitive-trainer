export interface Agent {
  name: string
  description?: string
  model: string
  tools: string[]
  prompt?: string
}
