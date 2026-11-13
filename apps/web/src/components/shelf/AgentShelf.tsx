"use client";
import { useEffect, useState, type FormEvent } from "react";
import { TIERS, TIER_IDS, type AskResponse, type ShelfResponse, type TierId } from "@ownify/shared";
import { API_URL, askAgent, getShelf } from "../../lib/api";
import { ShelfCards } from "./ShelfCards";

export function AgentShelf() {
  const [shelf, setShelf] = useState<ShelfResponse | null>(null);
  const [error, setError] = useState("");
  const [agent, setAgent] = useState<string | null>(null);
  const [tier, setTier] = useState<TierId>("balanced");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [askError, setAskError] = useState("");

  useEffect(() => {
    getShelf().then(setShelf).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!agent) return setAskError("Pick an agent first.");
    if (question.trim().length < 3) return setAskError("Type a question of at least a few characters.");
    setAskError("");
    setAnswer(null);
    setBusy(true);
    try {
      setAnswer(await askAgent(agent, question.trim(), tier));
    } catch (err) {
      setAskError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="error-box" role="alert">
        <h2>Cannot reach the API</h2>
        <p>Tried {API_URL} and got: {error}.</p>
        <p className="muted">Start it with <code>pnpm dev</code>, or set <code>NEXT_PUBLIC_API_URL</code> to where the API runs.</p>
      </div>
    );
  }
  if (!shelf) return <p className="muted">Loading the agent shelf…</p>;

  const chosen = shelf.agents.find((a) => a.id === agent);
  return (
    <div>
      {shelf.provider === "mock" && (
        <p className="notice">No Hugging Face token is set on the API, so answers are placeholders and nothing here counts as verified.</p>
      )}
      <ShelfCards shelf={shelf} selected={agent} onAsk={setAgent} />

      <section className="panel ask" aria-labelledby="ask-title">
        <h2 id="ask-title">{chosen ? `Ask the ${chosen.name.toLowerCase()}` : "Ask an agent"}</h2>
        <form onSubmit={ask}>
          <fieldset className="tiers">
            <legend>Answer budget</legend>
            {TIER_IDS.map((t) => (
              <label key={t} className="choice">
                <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => setTier(t)} />
                {TIERS[t].label}
              </label>
            ))}
          </fieldset>
          <label className="field wide-field">Your question
            <textarea rows={3} maxLength={800} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Asking…" : "Ask"}</button>
          {askError && <p className="muted" role="alert">{askError}</p>}
        </form>
        <div aria-live="polite">
          {answer && (
            <div className="answer-box">
              <p className="answer">{answer.answer}</p>
              <p className="muted">
                {answer.real ? `Answered by ${answer.model} via ${answer.provider}.` : "Placeholder reply from the mock model."} Budget: {TIERS[answer.tier].label}. Prompt hash {answer.promptHash.slice(0, 12)}.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
