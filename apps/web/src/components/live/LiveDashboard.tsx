"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { describeEvent, reduceRoundEvents, shortId, usd, type RunDetail, type SwarmEvent } from "@ownify/shared";
import { API_URL, getAllEvents, getRun, listRuns, simulate } from "../../lib/api";
import { RoundPanels } from "./RoundPanels";

const DEFAULT_SEED = 2026;
const DEFAULT_ROUNDS = 5;

export function LiveDashboard() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [run, setRun] = useState<RunDetail | null>(null);
  const [events, setEvents] = useState<SwarmEvent[]>([]);
  const [roundN, setRoundN] = useState(1);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(String(DEFAULT_SEED));
  const [rounds, setRounds] = useState(String(DEFAULT_ROUNDS));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const roundEvents = useMemo(() => events.filter((e) => e.round === roundN), [events, roundN]);
  const shown = Math.min(step, roundEvents.length);
  const view = useMemo(() => reduceRoundEvents(roundEvents.slice(0, shown)), [roundEvents, shown]);

  const loadRun = useCallback(async (id: string) => {
    const [detail, evs] = await Promise.all([getRun(id), getAllEvents(id)]);
    setRun(detail);
    setEvents(evs);
    setRoundN(1);
    setPlaying(false);
    setStep(evs.filter((e) => e.round === 1).length);
    setStatus("ready");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const runs = await listRuns();
        const last = runs[runs.length - 1];
        const id = last ? last.runId : (await simulate({ seed: DEFAULT_SEED, rounds: DEFAULT_ROUNDS })).runId;
        await loadRun(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();
  }, [loadRun]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep((s) => s + 1), 300);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (playing && step >= roundEvents.length) setPlaying(false);
  }, [playing, step, roundEvents.length]);

  function selectRound(n: number) {
    setRoundN(n);
    setPlaying(false);
    setStep(events.filter((e) => e.round === n).length);
  }

  async function runNew(e: FormEvent) {
    e.preventDefault();
    const s = Number(seed);
    const r = Number(rounds);
    if (!Number.isInteger(s) || s < 0 || s > 4294967295) return setFormError("Seed must be a whole number from 0 to 4294967295.");
    if (!Number.isInteger(r) || r < 1 || r > 50) return setFormError("Rounds must be a whole number from 1 to 50.");
    setFormError("");
    setBusy(true);
    try {
      const sim = await simulate({ seed: s, rounds: r });
      await loadRun(sim.runId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <p className="muted">Loading the latest simulation…</p>;
  if (status === "error") {
    return (
      <div className="error-box" role="alert">
        <h2>Cannot reach the API</h2>
        <p>Tried {API_URL} and got: {error}.</p>
        <p className="muted">Start it with <code>pnpm dev</code>, or set <code>NEXT_PUBLIC_API_URL</code> to where the API runs.</p>
      </div>
    );
  }

  return (
    <div>
      <form className="controls" onSubmit={runNew}>
        <label className="field">Seed<input inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value)} /></label>
        <label className="field">Rounds<input inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} /></label>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Running…" : "Run a new simulation"}</button>
        {formError && <p className="muted" role="alert">{formError}</p>}
      </form>
      {run && <p className="muted">Run {run.id}, seed {run.seed}, {run.config.buyers} buyers and {run.config.sellers} sellers. The same seed always gives the same market.</p>}

      <div className="live-layout">
        <nav aria-label="Rounds">
          <ul className="round-list">
            {run?.summary.map((s) => (
              <li key={s.round}>
                <button type="button" aria-current={s.round === roundN ? "true" : undefined} onClick={() => selectRound(s.round)}>
                  <strong>Round {s.round}</strong>
                  <br />
                  {s.status === "cleared" ? `${shortId(s.winner ?? "")} wins at ${usd(s.price ?? 0)}/h` : "No deal"}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <div className="controls">
            <button className="btn btn-primary" type="button" onClick={() => { setStep(0); setPlaying(true); }}>Replay this round</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setPlaying(false); setStep(roundEvents.length); }}>Show the result</button>
          </div>
          <p className="sr" aria-live="polite">{shown > 0 ? describeEvent(roundEvents[shown - 1]) : ""}</p>
          <RoundPanels view={view} record={run?.rounds[roundN - 1] ?? null} full={shown >= roundEvents.length} feed={roundEvents.slice(0, shown)} />
        </div>
      </div>
    </div>
  );
}
