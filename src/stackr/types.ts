export type OrderType = "Bid" | "Ask";

export interface Order {
  id: number;
  user: string; // user address
  orderType: OrderType;
  price: number;
  quantity: number;
  filled: number;
  timestamp: number;
}

export interface OrderBook {
  users: {
    [key: string]: {
      USDC: number;
      ETH: number;
    };
  }; // address -> asset -> balance
  bids: Order[]; // active buy orders
  asks: Order[]; // active sell orders
  filledOrders: Order[]; // filled orders
}

/**
 * A struct representing the input type of `createOrder` STF.
 */
export type CreateOrderInput = {
  orderType: OrderType;
  price: number;
  quantity: number;
  timestamp: number;
};
