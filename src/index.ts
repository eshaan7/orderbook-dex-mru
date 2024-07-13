import dotenv from "dotenv";
import express, { Request, Response } from "express";

import { orderbookStateMachine } from "./stackr/machine.ts";
import { transitions } from "./stackr/transitions.ts";
import { mru } from "./stackr/mru.ts";
import { cli } from "./cli.ts";
import { Playground } from "@stackr/sdk/plugins";
import { readBatchInfo } from "./utils.ts";

dotenv.config();

const api = async () => {
  // Initialize express server
  const app = express();
  app.use(express.json());

  // Routes

  app.post("/:reducerName", async (req: Request, res: Response) => {
    const { reducerName } = req.params;
    const actionReducer = transitions[reducerName];

    if (!actionReducer) {
      res.status(400).send({ message: "NO_SUCH_REDUCER" });
      return;
    }

    const schemaId = mru.getStfSchemaMap()[reducerName];
    const schema = mru.actions.getSchema(schemaId);

    if (!schema) {
      res.status(400).send({ message: "NO_SUCH_ACTION_SCHEMA" });
      return;
    }

    const { msgSender, signature, inputs } = req.body;

    try {
      const newAction = schema.actionFrom({ msgSender, signature, inputs });
      const ack = await mru.submitAction(reducerName, newAction);
      res.status(201).send({ ack });
    } catch (err: any) {
      res.status(400).send({ error: (err as Error).message });
    }
    return;
  });

  app.get("/state", (_req: Request, res: Response) => {
    const { state } = orderbookStateMachine;
    return res.send({ state });
  });

  app.get("/info", (_req: Request, res: Response) => {
    return res.send({
      schemas: mru.actions.getAllSchemas(),
      transitions: mru.stateMachines.getAllTransitions(),
      domain: mru.config.domain,
    });
  });

  app.get("/batch/:batchHash", async (_req: Request, res: Response) => {
    const { batchHash } = _req.params;
    const rows = await readBatchInfo(batchHash);
    const daMetadata = rows[0]?.daMetadata ? JSON.parse(rows[0]?.daMetadata) : {};
    return res.send({ daMetadata });
  })

  // Start the server
  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    // console.log(`Server is listening on port ${port}`);
  });
};

Playground.init(mru);
await api();
await cli();
