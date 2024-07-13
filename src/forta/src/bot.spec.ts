import { JsonRpcProvider, Result } from "ethers";
import { instance, mock, resetCalls, verify, when } from "ts-mockito";
import {
  Finding,
  FindingSeverity,
  FindingType,
  LogDescription,
  TransactionEvent,
} from "@fortanetwork/forta-bot";
import {
  handleTransaction,
} from "./bot";

describe("data availability checker agent", () => {
});
