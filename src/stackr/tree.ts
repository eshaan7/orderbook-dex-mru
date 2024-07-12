import { solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";

import { OrderBook } from "./types";

export const constructTree = (state: OrderBook): MerkleTree => {
  const userHashes = Object.entries(state.users).map(([address, assets]) =>
    solidityPackedKeccak256(
      ["address", "uint256", "uint256"],
      [address, assets.ETH, assets.USDC]
    )
  );
  const bidHashes = state.bids.map(
    ({ id, user, orderType, price, quantity, timestamp }) =>
      solidityPackedKeccak256(
        ["uint256", "address", "string", "uint256", "uint256", "uint256"],
        [id, user, orderType, price, quantity, timestamp]
      )
  );
  const askHashes = state.asks.map(
    ({ id, user, orderType, price, quantity, timestamp }) =>
      solidityPackedKeccak256(
        ["uint256", "address", "string", "uint256", "uint256", "uint256"],
        [id, user, orderType, price, quantity, timestamp]
      )
  );
  const filledOrderHashes = state.filledOrders.map(
    ({ id, user, orderType, price, quantity, timestamp }) =>
      solidityPackedKeccak256(
        ["uint256", "address", "string", "uint256", "uint256", "uint256"],
        [id, user, orderType, price, quantity, timestamp]
      )
  );
  const usersRoot = new MerkleTree(userHashes).getHexRoot();
  const bidsRoot = new MerkleTree(bidHashes).getHexRoot();
  const asksRoot = new MerkleTree(askHashes).getHexRoot();
  const filledOrdersRoot = new MerkleTree(filledOrderHashes).getHexRoot();
  return new MerkleTree([usersRoot, bidsRoot, asksRoot, filledOrdersRoot]);
};
