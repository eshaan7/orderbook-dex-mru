import inquirer from "inquirer";
import { Wallet } from "ethers";

import { OrderBookMachine, mru } from "./stackr/mru";
import { STATE_MACHINES } from "./stackr/machine";
import { CreateOrderSchema } from "./stackr/actions";
import { CLIAction, CLICreateOrderInput } from "./cli-types";
import { signMessage } from "./utils";
import { ActionConfirmationStatus } from "@stackr/sdk";
import { OrderType } from "./stackr/types";
import { ADDRESS_LABEL } from "./constants";

const sm = mru.stateMachines.get<OrderBookMachine>(
  STATE_MACHINES.ORDERBOOK
) as OrderBookMachine;

const accounts = {
  Operator: new Wallet(process.env.PRIVATE_KEY!),
  Bob: new Wallet(process.env.PRIVATE_KEY_USER_1!),
  Alice: new Wallet(process.env.PRIVATE_KEY_USER_2!),
};
let selectedWallet: Wallet;

const actions = {
  createOrder: async (
    orderType: OrderType,
    price: number,
    quantity: number
  ): Promise<void> => {
    const inputs = {
      orderType,
      price,
      quantity,
      timestamp: Date.now(),
    };
    const signature = await signMessage(
      selectedWallet,
      CreateOrderSchema,
      inputs
    );
    const action = CreateOrderSchema.actionFrom({
      inputs,
      signature,
      msgSender: selectedWallet.address,
    });
    action.name = "createOrder";
    const ack = await mru.submitAction("createOrder", action);
    const { logs, errors, executionStatus, confirmationStatus } =
      await ack.waitFor(ActionConfirmationStatus.C1);
    console.log("\n----------[output]----------");
    console.log(`Action ${action.hash} has been executed.`);
    console.debug({
      executionStatus,
      confirmationStatus,
      logs: JSON.stringify(logs),
      errors,
    });
    console.log("----------[/output]----------\n");
  },
  viewOrders: async (): Promise<void> => {
    const { users, asks, bids, filledOrders } = sm.state;
    console.log("\n----------[output]----------");
    console.log("Users:");
    console.table(
      Object.entries(users).map(([address, { USDC, ETH }]) => ({
        user: ADDRESS_LABEL[address],
        USDC,
        ETH,
      }))
    );
    console.log("Asks:");
    console.table(
      asks.map((ask) => ({ ...ask, user: ADDRESS_LABEL[ask.user] }))
    );
    console.log("Bids:");
    console.table(
      bids.map((bid) => ({ ...bid, user: ADDRESS_LABEL[bid.user] }))
    );
    console.log("Filled Orders:");
    console.table(
      filledOrders.map((order) => ({
        ...order,
        user: ADDRESS_LABEL[order.user],
      }))
    );
    console.log("----------[/output]----------\n");
  },
};

const askAccount = async (): Promise<"Operator" | "Bob" | "Alice"> => {
  const response = await inquirer.prompt([
    {
      type: "list",
      name: "account",
      message: "Choose an account:",
      choices: ["Operator", "Bob", "Alice"],
    },
  ]);
  return response.account;
};

const askAction = async (): Promise<CLIAction> => {
  const response = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Choose an action:",
      choices: [
        "Create Order (Bid/Ask)",
        "View Orders",
        "Switch account",
        "Exit",
      ],
    },
  ]);
  return response.action as CLIAction;
};

const askCreateOrderInput = async (): Promise<CLICreateOrderInput> => {
  console.log("\n----------[output]----------");
  console.log(`Address: ${selectedWallet.address}`);
  console.log(
    `Balance: ${JSON.stringify(sm.state.users[selectedWallet.address])}`
  );
  console.log("----------[/output]----------\n");
  return inquirer.prompt<CLICreateOrderInput>([
    {
      type: "list",
      name: "orderType",
      message: "Choose the order type:",
      choices: ["Bid", "Ask"],
    },
    {
      type: "input",
      name: "price",
      message: "Enter the limit price:",
      validate: (value: string): boolean | string => {
        const valid = !isNaN(parseInt(value)) && parseInt(value) > 0;
        return valid || "Please enter a positive number";
      },
      filter: (value: string): number => parseInt(value),
    },
    {
      type: "input",
      name: "quantity",
      message: "Enter the quantity:",
      validate: (value: string): boolean | string => {
        const valid = !isNaN(parseInt(value)) && parseInt(value) > 0;
        return valid || "Please enter a positive number";
      },
      filter: (value: string): number => parseInt(value),
    },
  ]);
};

export const cli = async (): Promise<void> => {
  let exit = false;
  let selectedAccount: string = ""; // To store the selected account

  while (!exit) {
    if (!selectedAccount) {
      selectedAccount = await askAccount();
      if (
        selectedAccount === "Operator" ||
        selectedAccount === "Bob" ||
        selectedAccount === "Alice"
      ) {
        selectedWallet = accounts[selectedAccount];
        console.log("\n----------[output]----------");
        console.log(
          `You have selected: ${selectedWallet.address.slice(0, 12)}...`
        );
        console.log("----------[/output]----------\n");
      }
    }

    const action = await askAction();

    switch (action) {
      case "Switch account": {
        selectedAccount = ""; // Reset selected account so the user can choose again
        break;
      }
      case "Create Order (Bid/Ask)": {
        const { orderType, price, quantity } = await askCreateOrderInput();
        await actions.createOrder(orderType, price, quantity);
        break;
      }
      case "View Orders": {
        await actions.viewOrders();
        break;
      }
      case "Exit": {
        exit = true;
        break;
      }
      default: {
        console.log("Invalid action selected.");
        break;
      }
    }
  }

  console.log("Exiting app...");
};
