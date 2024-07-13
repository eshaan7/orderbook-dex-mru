import { JsonRpcProvider } from "ethers";
import {
  Finding,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  scanEthereum,
} from "@fortanetwork/forta-bot";
import { initialize, extractData, chain, } from "avail-js-sdk"
import * as deployment from "../../../deployment.json";

// todo: move to .env
const MRU_URL = "https://cc40-217-111-214-66.ngrok-free.app";
const APPINBOX_BATCH_SUBMITTED_EVENT =
  "event BatchSubmitted(uint256 indexed batchHeight, bytes32 indexed batchRoot, uint256 indexed lastBlockHeight, uint256 firstBlockHeight, bytes32 stateRoot)";
const APPINBOX_ADDRESS = deployment.appInbox;

const getBatchInfoFromMRU = async (batchHash: string): Promise<any> => {
  const response = await fetch(`${MRU_URL}/batch/${batchHash}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return (await response.json()) as any;
};

const queryAvail = async (blockNum: number, extId: number) => {
  const AVAIL_RPC_ENDPOINT = "wss://turing-rpc.avail.so/ws"
  const API_SCAN_BLOCK = "https://avail-turing.webapi.subscan.io/api/scan/block"
  const API_SCAN_EXTRINSICS = "https://avail-turing.webapi.subscan.io/api/v2/scan/extrinsics"

  const responseBlocks = await fetch(API_SCAN_BLOCK, { method: "POST", headers: { "Content-type": "application/json", "Accept": "application/json", }, body: JSON.stringify({ "only_head": true, "block_num": blockNum }) });
  const blockHash = (await responseBlocks.json() as any).data.hash as string;
  const responseExt = await fetch(API_SCAN_EXTRINSICS, { method: "POST", headers: { "Content-type": "application/json", "Accept": "application/json", }, body: JSON.stringify({ "page": 0, "row": 10, "block_num": blockNum, "order": "asc" }) })
  const extHash = (await responseExt.json() as any).data.extrinsics[extId].extrinsic_hash as string;
  console.log("BlockHash:", blockHash)
  console.log("Extrinsic Hash:", extHash)

  const api = await initialize(AVAIL_RPC_ENDPOINT)
  const dataProof = await (api.rpc as any).kate.queryDataProof(extId, blockHash)
  console.log(`Header: ${JSON.stringify(dataProof, undefined, 2)}`)
  const data = await extractData(api, blockHash, extHash)
  console.log(`Data: ${data}`)

  return { blockHash, extHash, dataProof, data: JSON.parse(data) }
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

    // check if the batch data was made available on Avail DA
    const { daMetadata: { avail: { blockHeight, extIdx } } } = await getBatchInfoFromMRU(batchRoot);
    console.log(`BlockHeight: ${blockHeight}, ExtIdx: ${extIdx}`)
    const { blockHash, extHash, dataProof, data: blocks } = await queryAvail(blockHeight, extIdx)

    // todo: implement better logic to check validity and correctness of data from DA
    if (blocks[0].stateRoot === stateRoot) {
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
    rpcUrl: "http://3.6.115.65:8545",
    handleTransaction,
  });
}

// only run main() method if this file is directly invoked (vs just imported for testing)
if (require.main === module) {
  main();
}