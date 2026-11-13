"use client";
import { useEffect, useState } from "react";
import { describeEvent, type EventType } from "@ownify/shared";
import { getAllEvents, listRuns } from "../lib/api";

// Round-level story only; the per-buyer lines would drown the ticker.
const STORY: ReadonlySet<EventType> = new Set([
  "roundOpened", "poolLocked", "revealOpened", "offerVoided", "roundCleared", "roundFailed", "buyerDefaulted", "roundClosed",
]);

export function Ticker({ sample }: { sample: string[] }) {
  const [lines, setLines] = useState(sample);
  const [label, setLabel] = useState("Sample round");

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const runs = await listRuns();
        const last = runs[runs.length - 1];
        if (!last) return;
        const events = await getAllEvents(last.runId);
        const lastRound = events.length ? events[events.length - 1].round : 0;
        const story = events.filter((e) => e.round === lastRound && STORY.has(e.type)).map(describeEvent);
        if (!off && story.length) {
          setLines(story);
          setLabel(`Latest simulation, round ${lastRound}`);
        }
      } catch {
        if (!off) setLabel("Sample round (API offline)");
      }
    })();
    return () => { off = true; };
  }, []);

  return (
    <div className="ticker" role="region" aria-label="Live round ticker">
      <div className="wrap ticker-inner">
        <span className="ticker-tag">{label}</span>
        <div className="ticker-view" tabIndex={0}>
          <div className="ticker-track">
            <ul className="ticker-list">
              {lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
            <ul className="ticker-list" aria-hidden="true">
              {lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
