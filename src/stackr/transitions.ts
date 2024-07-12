import { Transitions, STF, REQUIRE } from "@stackr/sdk/machine";

import { OrderBookState } from "./state";
import { CreateOrderInput, Order } from "./types";

/**
 * createOrder is an STF to add a new order (bid or ask) to the state.
 */
const createOrder: STF<OrderBookState, CreateOrderInput> = {
  handler: ({ state, inputs, msgSender, block, emit }) => {
    const actor = msgSender.toString();
    const { orderType, price, quantity, timestamp } = inputs;
    // Ensure timestamp is in the past but not too far in the past (within 1 hour)
    REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");
    // REQUIRE(block.timestamp - timestamp < 60 * 60, "TIMESTAMP_TOO_OLD");
    // Ensure price is positive
    REQUIRE(price > 0, "Invalid price");
    // Ensure quantity is positive
    REQUIRE(quantity > 0, "Invalid quantity");
    // Check user exists
    const user = state.users[actor];
    REQUIRE(user !== undefined, "User not found");
    if (orderType === "Bid") {
      // Check user has enough balance
      // todo fix this maybe?
      const userActiveBidsTotal = state.bids
        .filter((bid) => bid.user === actor)
        .reduce((acc, bid) => acc + bid.price * (bid.quantity - bid.filled), 0);
      REQUIRE(
        user.USDC >= userActiveBidsTotal + price * quantity,
        "INSUFFICIENT_BALANCE"
      );
      // Record the order
      const order: Order = {
        id:
          state.asks.length + state.bids.length + state.filledOrders.length + 1,
        user: actor,
        orderType,
        price,
        quantity,
        filled: 0,
        timestamp,
      };
      state.bids.push(order);
      emit({ name: "BidOrderCreated", value: order });
    } else if (orderType === "Ask") {
      // Check user has enough balance
      // todo fix this maybe?
      const userActiveAsksTotal = state.asks
        .filter((ask) => ask.user === actor)
        .reduce((acc, ask) => acc + (ask.quantity - ask.filled), 0);
      REQUIRE(
        user.ETH >= userActiveAsksTotal + quantity,
        "INSUFFICIENT_BALANCE"
      );
      // Record the order
      const order: Order = {
        id:
          state.asks.length + state.bids.length + state.filledOrders.length + 1,
        user: actor,
        orderType,
        price,
        quantity,
        filled: 0,
        timestamp,
      };
      state.asks.push(order);
      emit({ name: "AskOrderCreated", value: order });
    } else {
      throw new Error("INVALID_ORDER_TYPE");
    }
    return state;
  },
};

export const transitions: Transitions<OrderBookState> = {
  createOrder,
};
