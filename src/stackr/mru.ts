import { MicroRollup } from "@stackr/sdk";

import { stackrConfig } from "../../stackr.config";
import { actionSchemas } from "./actions";
import { orderbookStateMachine } from "./machine";
import { MEVStrategy } from "./sequencerStrategy";

type OrderBookMachine = typeof orderbookStateMachine;

const mru = await MicroRollup({
  config: stackrConfig,
  actionSchemas: [...Object.values(actionSchemas)],
  isSandbox: process.env.IS_SANDBOX === "true",
  stateMachines: [orderbookStateMachine],
  blockHooks: {
    post: ["sortOrders", "executeMevTrades", "matchOrders"],
  },
  stfSchemaMap: {
    createOrder: actionSchemas.CreateOrderSchema.identifier,
  },
});

mru.sequencer.setStrategy(new MEVStrategy());

await mru.init();

export { mru, OrderBookMachine };
