export type QuizQuestion = { prompt: string; answers: readonly string[]; correct: number };

export const DELVER_ORIENTATION_MESSAGE = "Welcome, delvers. I’m renovating, and this level is full of freeloaders. Clear them out, and I’ll open Level Two.";
export const FINAL_PRACTICAL_MESSAGE = "Orientation concludes with a mandatory group project. Try not to let your classmates do all the dying.";

export const SCHOOL_QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  { prompt: "A corridor has eight rows of seven floor tiles. How many tiles are there?", answers: ["48", "54", "56"], correct: 2 },
  { prompt: "A 240-gram object displaces 80 milliliters of water. What is its density?", answers: ["3 grams per milliliter", "8 grams per milliliter", "160 grams per milliliter"], correct: 0 },
  { prompt: "Two fair six-sided dice are rolled. What is the probability that their sum is seven?", answers: ["One sixth", "One seventh", "One twelfth"], correct: 0 },
];

export type NimraithQuestion = { id: string; prompt: string; answer: string; item?: string; hint?: string };
export const NIMRAITH_QUESTIONS: readonly NimraithQuestion[] = [
  { id: "identity", prompt: "Who are you?", answer: "Nimraith. Former Dweomercore student, convicted spell thief, and currently deceased teaching aid." },
  { id: "curriculum", prompt: "Why does this floor feel staged?", answer: "Because it is. The classrooms, judges, bargains, traps—even the king. Halaster calls it Delver Orientation. Survivors call it Level One." },
  { id: "strings", prompt: "Why are you hanging like a puppet?", answer: "I stole a puppet spell. Halaster killed me, wired my bones to the ceiling, and called the result academic suspension." },
  { id: "heart", prompt: "What does ‘KEY TO MY HEART’ mean?", answer: "The trans vampires in the hidden velvet club keep the Stone-box Key. Use it before touching the heart-box, unless you enjoy acid." },
  { id: "priority", prompt: "What is the one thing we need to know?", answer: "Get the Stone-box Key from the hidden velvet club before touching the box. That is the shortest useful version." },
  { id: "classroom", prompt: "What happened in the classroom?", answer: "Vale is still teaching. She thinks the final is fair. The first mistake makes something underneath her smile; the second lets Professor Grin conduct the practical." },
  { id: "glasses-cheat", prompt: "How do we cheat?", answer: "The easiest way is to grab a pair of Glasses of Good Questions...", item: "Ball Cap of Bad Ideas", hint: "Ball Cap" },
  { id: "shirt", prompt: "What's the deal with this shirt?", answer: "Let me see. Huh. That is no ordinary Wife-Beater. That thing could survive a nuke.", item: "Wife-Beater of Questionable Resilience", hint: "Wife-Beater" },
];
