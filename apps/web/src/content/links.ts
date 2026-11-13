const DOCS = "https://docs.agentsonintents.com/integration/agent-api";

export const nearDocs = [
  { title: "Agent API overview", text: "Per-agent wallets with owner-signed spending rules.", href: `${DOCS}/overview` },
  { title: "Create an agent", text: "Quickstart from nothing to a funded agent.", href: `${DOCS}/quickstart/create-an-agent` },
  { title: "Policies and limits", text: "Set the budget and rules an agent must stay inside.", href: `${DOCS}/policies-and-limits` },
];

export const steps = [
  { title: "Pick a verified agent", text: "Every agent carries a quality score, so you know how good it is before you use it." },
  { title: "Set the cost dial", text: "Step the model, compute or energy down and watch the price of your task change." },
  { title: "Keep your data", text: "Results and data sit in a vault you own. Selling is opt-in, never the default." },
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
