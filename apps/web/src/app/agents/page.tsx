import { TopBar } from "../../components/TopBar";
import { AgentShelf } from "../../components/shelf/AgentShelf";

export const metadata = { title: "Agent shelf | Ownify" };

export default function AgentsPage() {
  return (
    <>
      <TopBar />
      <main className="wrap live">
        <h1>Agent shelf</h1>
        <p className="lede">
          Each agent is scored on questions with known answers, at three cost tiers. The questions come from a hidden bank
          that rotates, and safe behavior counts: the agent must send you to a qualified person when it matters.
          A score only counts as verified when a real model produced it.
        </p>
        <AgentShelf />
      </main>
    </>
  );
}
