export interface ToolSchema {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required: string[]
    additionalProperties: false
  }
  strict: true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolFn = (args: any) => Promise<string> | string

export class ToolBox {
  private fns = new Map<string, ToolFn>()
  private schemas: ToolSchema[] = []

  register(
    schema: Omit<ToolSchema, 'type'>,
    fn: ToolFn,
  ): void {
    this.fns.set(schema.name, fn)
    this.schemas.push({ type: 'function', ...schema })
  }

  getSchemas(names: string[]): ToolSchema[] {
    return this.schemas.filter(s => names.includes(s.name))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async run(name: string, args: any): Promise<string> {
    const fn = this.fns.get(name)
    if (!fn) throw new Error(`Unknown tool: ${name}`)
    const result = await fn(args)
    return result ?? ''
  }
}
