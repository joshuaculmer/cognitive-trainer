// Pre-seeded history for the Logic Trainer's first exchange.
// Simulates the agent having called talk_to_user with the opening question,
// so the session can start with the input box enabled — no initial API round-trip.

export const INITIAL_CALL_ID = 'fc_123456789'

export const INITIAL_MESSAGE = 'What do you believe? What do you wish you could articulate better?'

// Synthetic function_call entry. The matching function_call_output (the user's
// first message) is appended in useLogicTrainerSession before runAgent is called.
export const logicTrainerInitialHistory = [
  {
    type: 'function_call',
    id: INITIAL_CALL_ID,
    call_id: INITIAL_CALL_ID,
    name: 'talk_to_user',
    arguments: JSON.stringify({ message: INITIAL_MESSAGE }),
  },
]
