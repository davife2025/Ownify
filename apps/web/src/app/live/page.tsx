import { TopBar } from "../../components/TopBar";
import { LiveDashboard } from "../../components/live/LiveDashboard";

export const metadata = { title: "Live rounds | Ownify" };

export default function LivePage() {
  return (
    <>
      <TopBar />
      <main className="wrap live">
        <h1>Live rounds</h1>
        <p className="lede">
          Buyer agents pool their demand for GPU hours and run a sealed-bid round against seller agents.
          Watch a round unfold, then see who got what. Every run here is a simulation with scripted agents.
        </p>
        <LiveDashboard />
      </main>
    </>
  );
}
