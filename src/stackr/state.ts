import { State } from "@stackr/sdk/machine";

import { OrderBook } from "./types";
import { constructTree } from "./tree";

export class OrderBookState extends State<OrderBook> {
  constructor(state: OrderBook) {
    super(state);
  }

  getRootHash(): string {
    const tree = constructTree(this.state);
    return tree.getHexRoot();
  }
}
