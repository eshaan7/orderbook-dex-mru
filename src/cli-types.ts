import { Order, OrderType } from "./stackr/types";

export type CLIAction =
  | "Create Order (Bid/Ask)"
  | "View Orders"
  | "Switch account"
  | "Exit";

export interface CLICreateOrderInput {
  orderType: OrderType;
  price: number;
  quantity: number;
}

export interface CLICreateOrderResponse {
  order: Order;
}
