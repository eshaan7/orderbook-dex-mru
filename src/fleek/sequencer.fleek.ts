import { Wallet } from "ethers";
import { CreateOrderInput, Order, OrderBook } from "../stackr/types";

interface UnpackedAction {
  name: string;
  msgSender: string;
  payload: any;
  signature: string;
}

const STF_FLEEK_FUNCTION = "https://orderbook-stf.functions.on-fleek.app";
const MRU_URL = "https://15de-213-137-138-111.ngrok-free.app";
const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const getMRUInfo = async (): Promise<{ domain: any; schemas: any[] }> => {
  const response = await fetch(`${MRU_URL}/info`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return (await response.json()) as any;
};

const getCurrentState = async (): Promise<{ state: OrderBook }> => {
  const response = await fetch(`${MRU_URL}/state`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return (await response.json()) as any;
};

const submitOrder = async (
  inputs: CreateOrderInput
): Promise<UnpackedAction> => {
  const msgSender = ADDRESS;
  const wallet = new Wallet(PRIVATE_KEY);
  const { domain, schemas } = await getMRUInfo();
  const signature = await wallet.signTypedData(
    domain,
    schemas[0].types,
    inputs
  );
  await fetch(`${MRU_URL}/createOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ inputs, msgSender, signature }),
  });
  return { name: "createOrder", payload: inputs, msgSender, signature };
};

const simulateSTF = async (
  actions: UnpackedAction[]
): Promise<{ state: OrderBook }> => {
  const { state: currentState } = await getCurrentState();
  const block = {
    timestamp: Number(Date.now()),
  };
  const hooks = [[], ["sortOrders"]];
  const response = await fetch(STF_FLEEK_FUNCTION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ block, actions, currentState, hooks }),
  });
  return <{ state: OrderBook }>await response.json();
};

const injectMevTrade = async (state: OrderBook) => {
  let maxProfit = 0;
  let quantity = 0;
  let bestBid: Order | null = null;
  let bestAsk: Order | null = null;

  for (const bid of state.bids) {
    if (bid.user === ADDRESS) continue; // Skip our bids
    for (const ask of state.asks) {
      if (ask.user === ADDRESS) continue; // Skip our asks
      if (bid.price >= ask.price) {
        const spread = bid.price - ask.price;
        const quantityToTrade = Math.min(
          bid.quantity - bid.filled,
          ask.quantity - ask.filled
        );
        const potentialProfit = spread * quantityToTrade;
        if (potentialProfit > maxProfit) {
          quantity = quantityToTrade;
          maxProfit = potentialProfit;
          bestBid = bid;
          bestAsk = ask;
        }
      }
    }
  }

  if (bestBid && bestAsk && maxProfit > 0 && quantity > 0) {
    console.log(
      `Injecting MEV trade between Bid ID ${bestBid.id} and Ask ID ${bestAsk.id} for profit of ${maxProfit}`
    );
    // arbitrage: buy low (at ask price), sell high (at bid price)
    const mevBidOrder: CreateOrderInput = {
      orderType: "Bid",
      price: bestAsk.price,
      quantity,
      timestamp: Number(Date.now()),
    };
    const mevAskOrder: CreateOrderInput = {
      orderType: "Ask",
      price: bestBid.price,
      quantity,
      timestamp: Number(Date.now()),
    };
    const mevBidAction = await submitOrder(mevBidOrder);
    const mevAskAction = await submitOrder(mevAskOrder);
    return [mevBidAction, mevAskAction];
  }
};

export const main = async (params: {
  method: string;
  body: { actions: UnpackedAction[] };
}) => {
  const { method, body } = params;
  if (method === "GET") {
    return { message: "Hello, World!" };
  } else if (method === "POST") {
    const { actions } = body;
    console.log(`Simulating STF with ${actions.length} new actions`);
    const { state: newState } = await simulateSTF(actions);
    console.log(`STF simulation complete`);
    const mevTradeActions = await injectMevTrade(newState);
    if (mevTradeActions) {
      return { orderedActions: [...actions, ...mevTradeActions] };
    }
    return { orderedActions: actions };
  } else {
    return { error: "Method not allowed" };
  }
};
