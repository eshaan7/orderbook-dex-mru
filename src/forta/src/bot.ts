import { AbiCoder, Contract, Interface, JsonRpcProvider } from "ethers";
import {
  Finding,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  scanEthereum,
} from "@fortanetwork/forta-bot";
import { initialize, extractData } from "avail-js-sdk"
import * as AppInboxABI from "./AppInbox.abi.json";

const APPINBOX_BATCH_SUBMITTED_EVENT =
  "event BatchSubmitted(uint256 indexed batchHeight, bytes32 indexed batchRoot, uint256 indexed lastBlockHeight, uint256 firstBlockHeight, bytes32 stateRoot)";
// todo: move to .env
const APPINBOX_ADDRESS = "0xe8d8fde88A1ebB65FaAC16454F10D0Bd5D3851D9";
const L1_RPC_URL = "http://3.6.115.65:8545";

const queryAvail = async (blockNum: number, extId: number) => {
  const AVAIL_RPC_ENDPOINT = "wss://turing-rpc.avail.so/ws";
  const API_SCAN_BLOCK = "https://avail-turing.webapi.subscan.io/api/scan/block";
  const API_SCAN_EXTRINSICS = "https://avail-turing.webapi.subscan.io/api/v2/scan/extrinsics";

  const responseBlocks = await fetch(API_SCAN_BLOCK, { method: "POST", headers: { "Content-type": "application/json", "Accept": "application/json", }, body: JSON.stringify({ "only_head": true, "block_num": blockNum }) });
  const blockHash = (await responseBlocks.json() as any).data.hash as string;
  const page = Math.floor(extId / 10);
  const responseExt = await fetch(API_SCAN_EXTRINSICS, { method: "POST", headers: { "Content-type": "application/json", "Accept": "application/json", }, body: JSON.stringify({ "page": page, "row": 10, "block_num": blockNum, "order": "asc" }) });
  const extHash = (await responseExt.json() as any).data.extrinsics[extId - 10 * page].extrinsic_hash as string;
  console.log("blockHash:", blockHash, "extrinsicHash:", extHash);

  const api = await initialize(AVAIL_RPC_ENDPOINT);
  const dataProof = await (api.rpc as any).kate.queryDataProof(extId, blockHash);
  console.log(`DataProof: ${JSON.stringify(dataProof, undefined, 2)}`);
  const data = await extractData(api, blockHash, extHash);
  console.log(`Data: ${data}`);

  return { blockHash, extHash, dataProof: JSON.parse(JSON.stringify(dataProof)).dataProof, data: JSON.parse(data) };
}

export const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent,
  provider: JsonRpcProvider
) => {
  const findings: Finding[] = [];

  // filter the transaction logs for BatchSubmitted events
  const batchSubmittedEvents = txEvent.filterLog(
    APPINBOX_BATCH_SUBMITTED_EVENT,
    APPINBOX_ADDRESS
  );

  for (const batchSubmittedEvent of batchSubmittedEvents) {
    // extract event arguments
    const { batchHeight, batchRoot, lastBlockHeight, firstBlockHeight, stateRoot } =
      batchSubmittedEvent.args;

    // fetch Avail blob pointer (block number and extrinsic ID) against this MRU Batch from AppInbox contract
    const appInboxInterface = Interface.from(AppInboxABI.abi);
    const appInboxContract = new Contract(APPINBOX_ADDRESS, appInboxInterface, provider);
    const batchHeader = await appInboxContract.getFunction("batchBySequenceNumber").staticCall(batchHeight);
    const [daPackedStruct, daIdx] = batchHeader[2] as [string, bigint];
    if (daIdx !== 0n) {
      console.error("Only Avail supported for now!")
      break;
    }
    const daDecoded = AbiCoder.defaultAbiCoder().decode(["uint64", "uint32", "bytes32"], daPackedStruct);
    const blockNum = Number(daDecoded[0]);
    const extIdx = Number(daDecoded[1]);
    const dataLeaf = String(daDecoded[2]);
    
    // check if the batch data was made available on Avail DA
    console.log(`blockNum: ${blockNum}, ExtIdx: ${extIdx}, dataLeaf: ${dataLeaf}`);
    const { blockHash, extHash, dataProof, data: blocks } = await queryAvail(blockNum, extIdx);

    // todo: implement better logic to check validity and correctness of data from DA
    if (blocks[0].stateRoot === stateRoot && dataProof.leaf === dataLeaf) {
      console.log("-".repeat(50))
      findings.push(
        Finding.fromObject({
          name: "Data is available on Avail DA for Batch",
          description: `Data is available on Avail DA for Batch ${batchRoot}`,
          alertId: "FORTA-1",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata: {
            batchHeight: String(batchHeight),
            batchHash: batchRoot,
            lastBlockHeight: String(lastBlockHeight),
            firstBlockHeight: String(firstBlockHeight),
            stateRoot,
          },
          source: {
            chains: [{ chainId: txEvent.chainId }],
            transactions: [{ hash: txEvent.hash, chainId: txEvent.chainId }],
          },
        })
      );
    }
  }

  return findings;
};

async function main() {
  scanEthereum({
    rpcUrl: L1_RPC_URL,
    handleTransaction,
  });
}

// only run main() method if this file is directly invoked (vs just imported for testing)
if (require.main === module) {
  main();
}