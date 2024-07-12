import { Hook, Hooks } from "@stackr/sdk/machine";

import { OrderBookState } from "./state";

const WHITLISTED_SEARCHER_ADDRESSES = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
];

/**
 * sortOrders is a hook that sorts the `bids` and `asks` arrays
 * into highest bid first and lowest ask first respectively.
 */
const sortOrders: Hook<OrderBookState> = {
  handler: ({ state }) => {
    state.bids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp); // Higher price and earlier time
    state.asks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp); // Lower price and earlier time
    return state;
  },
};

/**
 * executeMevTrades is a hook that executes orders from
 * whitelisted searchers before market orders.
 */
const executeMevTrades: Hook<OrderBookState> = {
  handler: ({ state }) => {
    if (state.bids.length > 0 && state.asks.length > 0) {
      const bestBid = state.bids[0];
      const bestAsk = state.asks[0];

      const bestBidMevAsk = state.asks.find(
        (ask) =>
          ask.price === bestBid.price &&
          WHITLISTED_SEARCHER_ADDRESSES.includes(ask.user)
      );
      const bestAskMevBid = state.bids.find(
        (bid) =>
          bid.price === bestAsk.price &&
          WHITLISTED_SEARCHER_ADDRESSES.includes(bid.user)
      );

      if (bestBidMevAsk && bestAskMevBid) {
        // arbitrage: buy low (at ask price), sell high (at bid price)
        const quantity = Math.min(
          bestBid.quantity - bestBid.filled,
          bestAsk.quantity - bestAsk.filled
        );
        // buy low (at ask price)
        bestAsk.filled += quantity;
        bestAskMevBid.filled += quantity;
        state.users[bestAsk.user].USDC += quantity * bestAsk.price;
        state.users[bestAsk.user].ETH -= quantity;
        state.users[bestAskMevBid.user].USDC -= quantity * bestAsk.price;
        state.users[bestAskMevBid.user].ETH += quantity;
        // sell high (at bid price)
        bestBid.filled += quantity;
        bestBidMevAsk.filled += quantity;
        state.users[bestBid.user].USDC -= quantity * bestBid.price;
        state.users[bestBid.user].ETH += quantity;
        state.users[bestBidMevAsk.user].USDC += quantity * bestBid.price;
        state.users[bestBidMevAsk.user].ETH -= quantity;
        // Check if these orders are fully filled
        if (bestBid.filled >= bestBid.quantity) {
          // Move fully filled bid to filled orders
          state.filledOrders.push(state.bids.shift()!);
        }
        if (bestAsk.filled >= bestAsk.quantity) {
          // Move fully filled ask to filled orders
          state.filledOrders.push(state.asks.shift()!);
        }
        if (bestBidMevAsk.filled >= bestBidMevAsk.quantity) {
          // Move fully filled mev ask to filled orders
          state.asks.splice(state.asks.indexOf(bestBidMevAsk), 1);
          state.filledOrders.push(bestBidMevAsk);
        }
        if (bestAskMevBid.filled >= bestAskMevBid.quantity) {
          // Move fully filled mev bid to filled orders
          state.bids.splice(state.bids.indexOf(bestAskMevBid), 1);
          state.filledOrders.push(bestAskMevBid);
        }
      }
    }
    return state;
  },
};

/**
 * matchOrders is a hook that matches bid and ask orders.
 */
const matchOrders: Hook<OrderBookState> = {
  handler: ({ state }) => {
    while (state.bids.length > 0 && state.asks.length > 0) {
      const highestBid = state.bids[0];
      const lowestAsk = state.asks[0];
      if (highestBid.price >= lowestAsk.price) {
        // Match full or partial
        const quantityToTrade = Math.min(
          highestBid.quantity - highestBid.filled,
          lowestAsk.quantity - lowestAsk.filled
        );
        const tradePrice = lowestAsk.price;
        // Update filled amounts
        highestBid.filled += quantityToTrade;
        lowestAsk.filled += quantityToTrade;
        // Update user balances
        state.users[highestBid.user].USDC -= quantityToTrade * tradePrice;
        state.users[highestBid.user].ETH += quantityToTrade;
        state.users[lowestAsk.user].USDC += quantityToTrade * tradePrice;
        state.users[lowestAsk.user].ETH -= quantityToTrade;
        // Check if bid or ask order is fully filled
        if (highestBid.filled >= highestBid.quantity) {
          // Move fully filled bid to filled orders
          state.filledOrders.push(state.bids.shift()!);
        }
        if (lowestAsk.filled >= lowestAsk.quantity) {
          // Move fully filled ask to filled orders
          state.filledOrders.push(state.asks.shift()!);
        }
      } else {
        // No more matches
        break;
      }
    }
    return state;
  },
};

export const hooks: Hooks<OrderBookState> = {
  sortOrders,
  executeMevTrades,
  matchOrders,
};
