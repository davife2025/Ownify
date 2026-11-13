// Renders the dashboard panels on the server from a real simulation run and checks the output.
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { reduceRoundEvents, shortId, usd } from "@ownify/shared";
import { runSimulation } from "../../api/src/swarm/simulation";
import { RoundPanels } from "../src/components/live/RoundPanels";

const run = runSimulation({ seed: 1, rounds: 3, buyers: 20, sellers: 5, parent: "swarm.testnet" });
const record = run.rounds[1];
const res = record.result;
assert.equal(res?.status, "cleared");
if (res?.status !== "cleared") throw new Error("round 2 should clear");
const evs = run.events.filter((e) => e.round === 2);

const full = renderToStaticMarkup(<RoundPanels view={reduceRoundEvents(evs)} record={record} full feed={evs} />);
for (const must of ["Clearing price", usd(res.price), shortId(res.winner), "Winner", "Who got what", "Sealed bids", "Settlement", "Event feed", "Closed"]) {
  assert.ok(full.includes(must), `full render should include "${must}"`);
}
for (const a of res.allocations) assert.ok(full.includes(shortId(a.buyerId)), `allocation row for ${a.buyerId}`);
if (record.voidedOffers.length > 0) assert.ok(full.includes("void"), "voided offers are shown");
if (record.voidedDemands.length > 0) assert.ok(full.includes("Left out"), "left-out buyers are shown");
assert.equal(/undefined|NaN|\[object/.test(full), false, "no broken values in the markup");

const lockAt = evs.findIndex((e) => e.type === "poolLocked");
const early = renderToStaticMarkup(<RoundPanels view={reduceRoundEvents(evs.slice(0, lockAt))} record={record} full={false} feed={evs.slice(0, lockAt)} />);
assert.ok(early.includes("not locked yet"));
assert.equal(early.includes("Clearing price"), false);
assert.equal(early.includes("Who got what"), false);

const empty = renderToStaticMarkup(<RoundPanels view={reduceRoundEvents([])} record={null} full={false} feed={[]} />);
assert.ok(empty.includes("Waiting for the round to clear"));
assert.ok(empty.includes("Press replay"));

console.log(`ssr-check ok: round 2 cleared at ${usd(res.price)}/h by ${shortId(res.winner)}, ${res.allocations.length} buyers, ${full.length} bytes of markup`);
