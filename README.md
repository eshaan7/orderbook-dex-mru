# orderbook-dex-mru

An Orderbook DEX implemented as a Micro-Rollup using [@stackr/sdk](https://www.stackrlabs.xyz/) that uses [Avail](https://www.availproject.org/da) for Data Availability. Supports limit bid and ask orders.

This system has 3 primary components:
- The orderbook micro-rollup hosted as a node.js service which contains the state machine.
- The orderbook state machine hosted as a public Fleek function. Useful for auditability and simulation purposes for third parties.
- Third party sequencers (aka searchers) which order actions for the rollup. Deployed as Fleek functions to showcase external actors.

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