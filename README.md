# orderbook-dex-mru

> This project is for submission in ETHGlobal Brussels 2024 hackathon.

An Orderbook DEX implemented as a Micro-Rollup using [@stackr/sdk](https://www.stackrlabs.xyz/) that uses [Avail](https://www.availproject.org/da) for Data Availability and settles to Ethereum. 

The orderbook supports limit bid and ask orders.

This system has the following 4 primary components built using 3 different stacks (Stackr, Fleek network, Forta):
- The orderbook micro-rollup hosted as a node.js service. This includes sequencer, state machine and executor.
- The orderbook state machine hosted as a public Fleek function. Useful for auditability and simulation purposes by external actors.
- Third party searchers which order transactions for the rollup. Deployed as Fleek functions to simulate external actors.
- A Forta bot that checks that the rollup is actually publishing its data to Avail DA.

### Architecture

![Architecture](./architecture.png)

### Setup

#### Setup Fleek

```bash
$~/orderbook-dex-mru >> fleek functions create --name orderbook-stf
$~/orderbook-dex-mru >> fleek functions update --functionName orderbook-stf --slug orderbook-stf
$~/orderbook-dex-mru >> fleek functions create --name orderbook-sequencer
$~/orderbook-dex-mru >> fleek functions update --functionName orderbook-sequencer --slug orderbook-sequencer
$~/orderbook-dex-mru >> npx esbuild src/fleek/stf.fleek.ts --bundle --minify --format=esm --outfile=src/fleek/stf.fleek.js
$~/orderbook-dex-mru >> npx esbuild src/fleek/sequencer.fleek.ts --bundle --minify --format=esm --outfile=src/fleek/sequencer.fleek.js
$~/orderbook-dex-mru >> fleek functions deploy --path src/fleek/stf.fleek.js --name orderbook-stf
$~/orderbook-dex-mru >> fleek functions deploy --path src/fleek/sequencer.fleek.js --name orderbook-sequencer
```

#### Setup Stackr

```bash
$~/orderbook-dex-mru >> cp .env.example .env # fill in values
$~/orderbook-dex-mru >> stackr register
$~/orderbook-dex-mru >> stackr deploy
```

### Usage

```bash
$~/orderbook-dex-mru >> bun run src/index.ts
```

### Forta: Data availability checker bot

#### Description

This bot detects transactions on Ethereum that have a `BatchSubmitted` event from given Micro-Rollup's `AppInbox` contract address. It queries Avail's RPC to verify that the data was indeed published on the Avail DA corresponding to this rollup Batch. A finding is created if the data is available an`d correct.

#### Supported Chains

- Ethereum (and testnets)

#### Alerts

Describe each of the type of alerts fired by this bot

- FORTA-1
  - Fired when a transaction contains a `BatchSubmitted` event from Micro-Rollup's AppInbox contract and we have verified that the data does exist on Avail DA.

#### Test Data

The bot behaviour can be verified with the following transactions:

```bash
$~/orderbook-dex-mru/src/forta >> FORTA_CHAIN_ID=69420 npm run tx 0x0002ec20286b4c08a4c614b2ac57afac6f947d5d5f87ea8064d223d1b3b70ef1 --chainId 69420
```