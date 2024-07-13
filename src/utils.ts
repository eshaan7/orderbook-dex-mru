import { ActionSchema, AllowedInputTypes } from "@stackr/sdk";
import { Wallet } from "ethers";
import sqlite3 from "sqlite3";
import { stackrConfig } from "../stackr.config";

export const signMessage = async (
  wallet: Wallet,
  schema: ActionSchema,
  payload: AllowedInputTypes
) => {
  const signature = await wallet.signTypedData(
    schema.domain,
    schema.EIP712TypedData.types,
    payload
  );
  return signature;
};


export const readBatchInfo = async (batchHash: string): Promise<
  any
> => {
  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(stackrConfig.datastore.uri, (err) => {
      if (err) {
        console.error(err.message);
        reject(err);
      }
    });

    let sql = `
    SELECT 
      b.daMetadata as daMetadata
    FROM
      batches b
    WHERE
      b.hash = ?;
    `;

    db.all(sql, [batchHash], (err, rows: any[]) => {
      if (err) {
        console.error(err.message);
        reject(err);
      }
      resolve(
        rows.map((row) => ({
          ...row,
        }))
      );
    });

    db.close((err) => {
      if (err) {
        console.error(err.message);
        reject(err);
      }
    });
  });
};