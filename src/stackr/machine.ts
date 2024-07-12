import { StateMachine } from "@stackr/sdk/machine";

import genesisState from "./../../genesis-state.json";
import { transitions } from "./transitions";
import { OrderBookState } from "./state";
import { hooks } from "./hooks";

const STATE_MACHINES = {
  ORDERBOOK: "orderbook",
};

const orderbookStateMachine = new StateMachine({
  id: STATE_MACHINES.ORDERBOOK,
  stateClass: OrderBookState,
  initialState: genesisState.state,
  on: transitions,
  hooks,
});

export { STATE_MACHINES, orderbookStateMachine };
