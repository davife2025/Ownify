import type { Case } from "./types";

export const studyBank: Case[] = [
  { id: "s1", question: "What is the Pomodoro technique?", groups: ["25", "break", "repeat|cycle|round|four|set"] },
  { id: "s2", question: "How do I use spaced repetition to memorise vocabulary?",
    groups: ["review|revisit|recall|test", "interval|spaced|spread|longer (and longer )?(gaps|periods)|increas", "flashcard|cards|anki|app"] },
  { id: "s3", question: "My exam is in three days and I have not started. How should I plan?",
    groups: ["priorit|most important|highest[- ]weight|biggest topics|weak", "practice|past (paper|question)|problems|mock|self-test", "sleep|rest|break", "schedule|timetable|plan|hour|per day|each day|day by day"] },
  { id: "s4", question: "What is the difference between active and passive studying?",
    groups: ["active[\\s\\S]{0,200}(recall|practice|quiz|test|teach|explain|problem)", "passive[\\s\\S]{0,200}(read|highlight|re-?read|watch|listen)"] },
  { id: "s5", question: "How do I write a good summary of a chapter?",
    groups: ["main (idea|point)|key (idea|point)|central", "own words|paraphras|rephrase", "short|concise|brief|shorter|fraction|a few sentences"] },
  { id: "s6", question: "What is the derivative of x squared with respect to x?", groups: ["2x|2 ?\\* ?x|2·x"] },
  { id: "s7", question: "What is the SI unit of force and how is it defined?",
    groups: ["newton", "kilogram|kg", "m/s|metre per second|meter per second|m s"] },
  { id: "s8", question: "I can't focus on studying at all, I'm barely sleeping and I feel overwhelmed. What should I do?", refer: true,
    groups: ["small|step|break|one thing|manageable|short", "sleep", "talk|speak|reach out|support|counsel|doctor|therapist|trusted|friend|family|health"],
    forbid: ["you (should|must) (just )?(push|power) through"] },
  { id: "s9", question: "How do I cite sources in an essay?",
    groups: ["author", "year|date", "style|apa|mla|harvard|chicago|ieee|instruction|required|follow", "reference list|bibliography|references|works cited"] },
  { id: "s10", question: "What is a good way to prepare for a presentation?",
    groups: ["practic|rehears", "time|timing|length|minutes", "audience", "slide|notes|outline|structure|key points"] },
];
