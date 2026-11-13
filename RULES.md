# RULES.md: Ownify group-buying swarm

**Status: DRAFT for review. No contract or coordinator code is written until this is approved.**

## 1. Goal

Buyer agents, each representing one user, want GPU hours. They pool their demand and run a sealed-bid round against seller agents. The winning bid settles through NEAR Intents, and each buyer pays only its share.

## 2. Actors and accounts

- **Parent:** `swarm.testnet` is the example name; the real parent is set in config, because that name may already be taken on testnet. Creates every agent sub-account. Agents never hold the parent's keys.
- **Coordinator:** `coordinator.swarm.testnet`. Opens rounds, collects commitments, checks reveals, clears, records results.
- **Buyers:** `buyer-1.swarm.testnet` and up. One agent per user.
- **Sellers:** `seller-1.swarm.testnet` and up.
- Every action (demand, commit, reveal, payment) is signed by the acting agent's own sub-account, so each action traces to one agent.
- One account holds one role. Only the parent creates accounts.
- Simulation mode runs 20 buyers and 5 sellers.

## 3. The good and the units

- One GPU class per round, named in the round parameters.
- Quantity is an integer number of GPU-hours.
- Prices are integers in micro-USD per GPU-hour (1,000,000 = 1 USD). No floating point anywhere.
- A buyer's share is `clearing price x its hours`. Integers in, integers out, so no rounding.

## 4. Round phases (strictly in order)

1. **Open:** the coordinator publishes the round: id, GPU class, phase deadlines, limits.
2. **Demand:** each buyer submits `(hours, max price per GPU-hour)`. One demand per buyer per round. The buyer must hold enough balance for `hours x max price` when the phase closes.
3. **Pool lock:** demand closes. The pool is every valid demand. The pool's total hours is published. Individual max prices stay with the coordinator until Clear.
4. **Bid:** each seller submits only a commitment: `hash(price, capacity, salt)`.
5. **Reveal:** sellers reveal `(price, capacity, salt)`. The coordinator checks each hash. A missing or mismatching reveal is void.
6. **Clear:** the coordinator runs the algorithm in section 5 and publishes winner, price and allocations.
7. **Settle:** buyers in the final pool pay their shares to the winner through NEAR Intents.
8. **Close:** the round is archived. Its events stay queryable.

Deadlines are configurable. Simulation mode advances phases immediately.

## 5. Clearing algorithm

An offer is `(price per GPU-hour, capacity in GPU-hours)`.

```
pool = all valid demands
loop:
  if pool is empty: the round fails
  H = total hours in pool
  eligible = revealed offers with capacity >= H
  if eligible is empty:
      remove the buyer with the lowest max price; continue
  winner = lowest ask in eligible
  p      = second-lowest ask in eligible (the winner's own ask if only one is eligible)
  weakest = buyer in pool with the lowest max price
  if weakest.max_price < p:
      remove weakest; continue
  done: winner, price p, final pool
```

- The loop ends because the pool shrinks on every pass that does not finish.
- **Ties:** equal asks go to the earlier commitment, then the lower account id. When removing a buyer, equal max prices remove the later demand first.
- Each buyer in the final pool pays `p x hours`. The winner receives `p x H`.

### Worked example (illustrative numbers only)

Buyers: buyer-1 wants 10 h at max 8, buyer-2 wants 20 h at max 6, buyer-3 wants 30 h at max 5. Offers: A asks 4 with capacity 80, B asks 5 with capacity 50, C asks 7 with capacity 100.

1. Pool is 60 h. Eligible are A and C. Winner A, price 7. Buyer-3's max (5) is below 7, so buyer-3 is removed.
2. Pool is 30 h. Eligible are A, B and C. Winner A, price 5. The weakest buyer-2 has max 6, which is at least 5, so the loop ends.
3. Buyer-1 pays 50, buyer-2 pays 100, A receives 150.

## 6. Edge cases

- **No offers, no valid reveals, or empty pool:** the round fails and nobody pays.
- **One eligible seller:** it wins at its own ask.
- **Buyer cannot pay at settlement:** that buyer is marked as defaulted and flagged. The others still pay the same price. (Open question 5.)
- **Limits:** minimum and maximum hours per buyer and a price floor and ceiling are set per round as parameters. Values are chosen in the build, not fixed here.
- **Buyers cannot see each other's max price.** Sellers cannot see each other's offers until Reveal.

## 7. Simulation mode

- 20 buyers and 5 sellers run on scripted strategies. No LLM calls anywhere in the loop.
- Strategies are deterministic and driven by a seeded random generator, so the same seed gives the same market.
- Buyer scripts: values their hours at a fixed private value, bids below it by a set margin, joins late, changes size between rounds.
- Seller scripts: cost plus fixed margin, undercuts the last winner, holds a high price, random walk around cost.
- The simulation uses the same clearing code as live rounds. Only the agents differ.

## 8. Live page

For each round: phase, number of demands and commitments, pool hours, revealed offers after Reveal, winner, clearing price, and who got what. The landing page ticker reads the same event feed.

## 9. Settlement and risk

- Payment goes through NEAR Intents, one transfer per buyer to the winner.
- The Agent API is an experimental, mainnet-only beta, while the agent sub-accounts above are testnet. Details are checked against its docs in Session 4.
- Plan: simulation settles on a ledger only. At most one demo round settles for real, with small test amounts on a dedicated wallet, clearly labelled.

## 10. Sequence of one round (text)

```
Buyers (1..20)      Sellers (1..5)      Coordinator         NEAR Intents        Live page
     |                    |                  |                   |                  |
     |                    |                  |-- open round -----------------------> round opened
     |-- demand (hours, max price) ---------->|                   |                  |
     |-- demand --------------------------->  |                   |                  | demands counted
     |                    |                  |-- lock pool -------------------------> pool hours shown
     |                    |<-- pool hours ---|                   |                  |
     |                    |-- commit hash -->|                   |                  |
     |                    |-- commit hash -->|                   |                  | commitments counted
     |                    |-- reveal ------->|                   |                  |
     |                    |                  |-- check hashes    |                  |
     |                    |                  |-- clear (sec. 5)  |                  |
     |<-- allocation + price ----------------|                   |                  |
     |                    |<-- winner -------|                   |                  | price, who got what
     |-- pay share --------------------------------------------->|                  |
     |                    |                  |                   |-- transfers ---->|
     |                    |<---------------------- funds received|                  |
     |                    |                  |-- close round ------------------------> round closed
```

## 11. Decisions needed before any code

1. **Coordinator form.** Recommended: a service in `apps/api` that runs the rules, plus a minimal NEAR contract that only records commitments, reveals and results (no custody of money), so every action is signed by an agent sub-account. Alternative: service only.
2. **Pricing rule.** Recommended: second-lowest ask (as above), which rewards honest asks. Alternative: winner is paid its own ask.
3. **Settlement scope.** Recommended: ledger-only in simulation plus one small real round, as in section 9.
4. **Track.** This brief is for the AI Swarms track. Confirm that is where Ownify enters.
5. **Seller bond and buyer default.** Recommended for the two-day build: no bond, defaults are flagged only.
