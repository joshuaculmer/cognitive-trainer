import type { Agent } from '../../types'
import { DA_PROMPT } from './prompt_devils_advocate'
import { MAIN_PROMPT } from './prompt_main_agent'

export const agents: Agent[] = [
  {
    name: 'main',
    model: 'gpt-5-mini',
    tools: ['talk_to_user', 'send_message_to_user', 'conclude', 'devils-advocate'],
    prompt: MAIN_PROMPT,
  },
  {
    name: 'devils-advocate',
    model: 'gpt-5-mini',
    description: 'Finds counter arguments, logical fallacies, holes, violations in logic, weak premises in arguments. Input (str): raw text from the user. Output (str): response from devils-advocate.',
    tools: [],
    prompt: DA_PROMPT,
  },
]
