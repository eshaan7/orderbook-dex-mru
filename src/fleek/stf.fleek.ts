import { orderbookStateMachine as stateMachine } from "../stackr/machine.ts";

// state machine executor
function run(block, actions, prevState, hooks) {
  stateMachine.disableLogging?.(true);
  stateMachine.updateState(prevState);
  const [pre = [], post = []] = hooks || [];

  if (pre.length) {
    stateMachine.executeHooks({ names: pre, block });
  }
  for (const action of actions) {
    try {
      stateMachine.reduce({ ...action, block });
    } catch (error) {
      if (!action.isReverted) {
        throw error;
      }
    }
  }
  if (post.length) {
    stateMachine.executeHooks({ names: post, block });
  }

  const { state, stateRootHash: root } = stateMachine;
  return { state, root };
}

// entrypoint
export const main = async (params) => {
  const { method, body } = params;
  if (method === "GET") {
    const state = stateMachine.state;
    const root = stateMachine.stateRootHash;
    return { state, root };
  } else if (method === "POST") {
    const { block, actions, currentState, hooks } = body;
    const { state, root } = run(block, actions, currentState, hooks);
    return { state, root };
  } else {
    return { error: "Method not allowed" };
  }
};
