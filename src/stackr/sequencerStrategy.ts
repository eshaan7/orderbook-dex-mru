import { BaseStrategy, Action } from "@stackr/sdk";
import { UnpackedAction } from "@stackr/sdk/machine";
import { CreateOrderSchema } from "./actions";

const SEQUENCER_FLEEK_FUNCTION =
  "https://orderbook-sequencer.functions.on-fleek.app";

/**
 * MEVStrategy is a custom sequencer strategy that outsources ordering
 * of actions to a third party fleek function.
 */
export class MEVStrategy extends BaseStrategy {
  private executedActionHashes: string[] = [];

  constructor() {
    super("MEVStrategy");
  }

  async getOrderedActions(actions: Action[]): Promise<Action[]> {
    const unexecutedActions = actions.filter(
      ({ hash }) => !this.executedActionHashes.includes(hash)
    );
    const unpackedActions = unexecutedActions.map(
      ({ name, msgSender, inputs, signature }) =>
        ({
          name,
          msgSender,
          payload: inputs,
          signature,
        }) as UnpackedAction
    );
    console.log(
      `Getting ordering for ${unpackedActions.length} actions from third party sequencer...`
    );
    const response = await fetch(SEQUENCER_FLEEK_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        actions: unpackedActions,
      }),
    });
    if (!response.ok) {
      console.error(await response.text());
      return unexecutedActions;
    }
    const { orderedActions } = (await response.json()) as {
      orderedActions: UnpackedAction[];
    };
    console.log(
      `Got ${orderedActions.length} ordered actions from third party sequencer...`
    );
    const orderedActionsInstances = orderedActions.map(
      ({ payload, signature, msgSender }) => {
        const action = CreateOrderSchema.actionFrom({
          inputs: payload,
          signature,
          msgSender,
        });
        action.name = "createOrder";
        return action;
      }
    );
    this.executedActionHashes.push(
      ...orderedActionsInstances.map(({ hash }) => hash)
    );
    return orderedActionsInstances;
  }
}
