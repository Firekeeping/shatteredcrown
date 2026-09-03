import { SCRIPTED_DUNGEON_ENCOUNTERS, type EncounterEffect, type ScriptedEncounter } from "./encounter-engine";
import { NIMRAITH_QUESTIONS } from "./scene-content";

export type ForgeChoice = { id: string; text: string; nextId: string | null };
export type ForgeNode = { id: string; speaker: string; text: string; note: string; choices: ForgeChoice[] };
export type DialogueFile = { format: "shattered-crown-dialogue"; version: 1; sourceInteractionId?: string; character: string; sceneTitle: string; openingNodeId: string; nodes: ForgeNode[] };
export type DialogueCatalogEntry = { id: string; label: string; file: DialogueFile };

const speakerFor = (effect: Extract<EncounterEffect, { kind: "bubble" }>, encounter: ScriptedEncounter) =>
  effect.speaker === "hero" ? "Player" : effect.speaker === "golem" ? "Flesh Golem" : effect.speaker === "npc-2" ? "Second NPC" : effect.speaker === "npc-3" ? encounter.kind === "secret-club" ? "DJ Bitey" : "Third NPC" : encounter.speaker;

const mechanicsFor = (effects: EncounterEffect[]) => effects.flatMap((effect) => {
  if (effect.kind === "bubble" || effect.kind === "narration") return [];
  if (effect.kind === "secret-club-tour") return [JSON.stringify({
    kind: effect.kind,
    movement: `${effect.stations.length} authored tour stations followed by the room exit`,
    completion: effect.completion,
  })];
  return [JSON.stringify(effect)];
});

const ruleNote = (encounter: ScriptedEncounter, choice: ScriptedEncounter["choices"][number]) => {
  const requirements = choice.requirements?.map((requirement) => JSON.stringify(requirement)).join(", ") || "None";
  const mechanics = mechanicsFor(choice.effects).join("\n") || "Conversation only";
  const shared = choice.sharedSequence ? `\nSHARED CONTINUATION: ${choice.sharedSequence}` : "";
  return `SOURCE: ${encounter.kind} · ${choice.tone.toUpperCase()}\nREQUIREMENTS: ${requirements}${shared}\nGAME EFFECTS:\n${mechanics}`;
};

const CLUB_HOSTS = ["Countess Velvet", "Lady Fangirl", "Mistress Maybe", "DJ Bitey"];

const dialogueSteps = (effects: EncounterEffect[], encounter: ScriptedEncounter) => effects.flatMap((effect) => {
  if (effect.kind === "bubble") return [{ speaker: speakerFor(effect, encounter), text: effect.text, note: "" }];
  if (effect.kind === "narration") return [{ speaker: "Narration", text: effect.text, note: effect.title }];
  if (effect.kind === "secret-club-tour") return [
    ...effect.stations.flatMap((station) => [
      { speaker: CLUB_HOSTS[station.host] || encounter.speaker, text: station.line, note: `Tour station ${effect.stations.indexOf(station) + 1}` },
      { speaker: "Narration", text: station.aside, note: `Tour station ${effect.stations.indexOf(station) + 1}` },
      { speaker: "Player", text: station.reply, note: "" },
    ]),
    { speaker: "Player", text: "I survived the orientation.", note: "The tour ends and its rewards are granted." },
  ];
  return [];
});

const appendDialogueSequence = (
  nodes: ForgeNode[],
  start: ForgeNode,
  idPrefix: string,
  effects: EncounterEffect[],
  encounter: ScriptedEncounter,
) => {
  let previous = start;
  dialogueSteps(effects, encounter).forEach((step, lineIndex) => {
    const id = `${idPrefix}-line-${lineIndex + 1}`;
    previous.choices.push({ id: `${id}-continue`, text: "Continue", nextId: id });
    const line: ForgeNode = { id, ...step, choices: [] };
    nodes.push(line);
    previous = line;
  });
  return previous;
};

const encounterFile = (encounter: ScriptedEncounter): DialogueFile => {
  const entryRoot: ForgeNode = encounter.entryVariants?.length
    ? { id: "opening", speaker: "Condition", text: "How was the encounter triggered?", note: `Room ${encounter.roomLabel} · ${encounter.kind}`, choices: [] }
    : { id: "opening", speaker: encounter.speaker, text: encounter.opening, note: `Room ${encounter.roomLabel} · ${encounter.kind}`, choices: [] };
  const choiceHub: ForgeNode = encounter.entryVariants?.length
    ? { id: "encounter-choices", speaker: "Player", text: "Choose a response.", note: "Available after either entrance sequence.", choices: [] }
    : entryRoot;
  const nodes: ForgeNode[] = choiceHub === entryRoot ? [entryRoot] : [entryRoot, choiceHub];
  const sharedHubs = new Map((encounter.sharedSequences || []).map((sequence) => {
    const hub: ForgeNode = {
      id: `shared-${sequence.id}`,
      speaker: "Shared Sequence",
      text: sequence.title,
      note: `SHARED CONTINUATION: ${sequence.id}\nGAME EFFECTS:\n${mechanicsFor(sequence.effects).join("\n") || "Conversation only"}`,
      choices: [],
    };
    nodes.push(hub);
    appendDialogueSequence(nodes, hub, `shared-${sequence.id}`, sequence.effects, encounter);
    return [sequence.id, hub] as const;
  }));
  const phaseFlags = [...new Set(encounter.choices.flatMap((choice) =>
    choice.requirements?.filter((requirement) => requirement.kind === "flag-present").map((requirement) => requirement.flag) || [],
  ))];
  const phaseHubs = new Map(phaseFlags.map((flag) => {
    const transition = encounter.choices.find((choice) => choice.effects.some((effect) => effect.kind === "set-flag" && effect.flag === flag));
    const reopen = transition?.effects.find((effect) => effect.kind === "reopen-encounter");
    const hub: ForgeNode = {
      id: `phase-${flag}`,
      speaker: reopen?.kind === "reopen-encounter" && reopen.speaker === "golem" ? "Flesh Golem" : encounter.speaker,
      text: reopen?.kind === "reopen-encounter" ? reopen.text : `Conversation phase: ${flag}`,
      note: `Choices requiring ${flag}`,
      choices: [],
    };
    nodes.push(hub);
    return [flag, hub] as const;
  }));
  encounter.entryVariants?.forEach((variant) => {
    const variantId = `entry-${variant.id}`;
    entryRoot.choices.push({ id: `${variantId}-choice`, text: variant.label, nextId: variantId });
    const condition: ForgeNode = { id: variantId, speaker: "Condition", text: variant.label, note: "Encounter entrance", choices: [] };
    nodes.push(condition);
    const previous = appendDialogueSequence(nodes, condition, variantId, variant.prelude, encounter);
    const openingId = `${variantId}-opening`;
    previous.choices.push({ id: `${openingId}-continue`, text: "Continue", nextId: openingId });
    nodes.push({ id: openingId, speaker: encounter.speaker, text: variant.opening, note: "", choices: [{ id: `${openingId}-responses`, text: "Choose a response", nextId: choiceHub.id }] });
  });
  encounter.itemCallbacks?.forEach((callback, callbackIndex) => {
    const triggerId = `item-trigger-${callbackIndex + 1}`;
    choiceHub.choices.push({ id: `${triggerId}-choice`, text: `[ITEM TRIGGER] ${callback.item}`, nextId: triggerId });
    const trigger: ForgeNode = {
      id: triggerId,
      speaker: "Automatic Item Trigger",
      text: `When the party carries ${callback.item}`,
      note: `TRIGGER: PARTY ITEM · ${callback.item}\nThis dialogue automatically plays before the selected encounter response.\nGAME EFFECTS:\n${mechanicsFor(callback.effects).join("\n") || "Conversation only"}`,
      choices: [],
    };
    nodes.push(trigger);
    const last = appendDialogueSequence(nodes, trigger, triggerId, callback.effects, encounter);
    last.choices.push({ id: `${triggerId}-return`, text: "Return to responses", nextId: choiceHub.id });
  });
  if (encounter.quiz) {
    const quiz = encounter.quiz;
    choiceHub.choices.push({ id: "start-quiz", text: quiz.startLabel, nextId: "quiz-intro" });
    nodes.push({ id: "quiz-intro", speaker: "Narration", text: quiz.intro, note: "The show begins.", choices: [{ id: "quiz-intro-continue", text: "Continue", nextId: "quiz-question-1" }] });
    quiz.questions.forEach((question, questionIndex) => {
      const questionId = `quiz-question-${questionIndex + 1}`;
      const nextId = questionIndex + 1 < quiz.questions.length ? `quiz-question-${questionIndex + 2}` : "quiz-outcome";
      const questionNode: ForgeNode = { id: questionId, speaker: encounter.speaker, text: question.prompt, note: `Question ${questionIndex + 1} of ${quiz.questions.length}`, choices: [] };
      nodes.push(questionNode);
      question.answers.forEach((answer, answerIndex) => {
        const feedbackId = `${questionId}-answer-${answerIndex + 1}`;
        const correct = answerIndex === question.correct;
        questionNode.choices.push({ id: `${feedbackId}-choice`, text: answer, nextId: feedbackId });
        nodes.push({
          id: feedbackId,
          speaker: encounter.speaker,
          text: correct ? quiz.correctResponse : quiz.incorrectResponse,
          note: correct ? "Correct answer" : "Incorrect answer",
          choices: [{ id: `${feedbackId}-continue`, text: "Continue", nextId }],
        });
      });
    });
    nodes.push({
      id: "quiz-outcome",
      speaker: "Condition",
      text: "Calculate the final score.",
      note: "Two or more correct answers gives the heroes first turn.",
      choices: [
        { id: "quiz-win-choice", text: "If the party scores 2 or 3", nextId: "quiz-win" },
        { id: "quiz-loss-choice", text: "If the party scores 0 or 1", nextId: "quiz-loss" },
      ],
    });
    nodes.push({ id: "quiz-win", speaker: "Narration", text: quiz.winningOutcome, note: "Combat begins with the heroes acting first.", choices: [] });
    nodes.push({ id: "quiz-loss", speaker: "Narration", text: quiz.losingOutcome, note: "Combat begins with the manticores acting first.", choices: [] });
  }
  encounter.choices.forEach((choice, choiceIndex) => {
    const branchId = `branch-${choiceIndex + 1}-${choice.id}`;
    const phaseRequirement = choice.requirements?.find((requirement) => requirement.kind === "flag-present" && phaseHubs.has(requirement.flag));
    const parentHub = phaseRequirement?.kind === "flag-present" ? phaseHubs.get(phaseRequirement.flag)! : choiceHub;
    parentHub.choices.push({ id: `choice-${choice.id}`, text: choice.label, nextId: branchId });
    const branch: ForgeNode = { id: branchId, speaker: "Player", text: choice.label, note: ruleNote(encounter, choice), choices: [] };
    nodes.push(branch);
    const outcomes = choice.conditionalEffects?.length
      ? [{ id: "default", label: "If the village was saved", effects: choice.effects }, ...choice.conditionalEffects]
      : null;
    if (outcomes) {
      outcomes.forEach((outcome) => {
        const outcomeId = `${branchId}-${outcome.id}`;
        branch.choices.push({ id: `${outcomeId}-choice`, text: outcome.label, nextId: outcomeId });
        const mechanics = mechanicsFor(outcome.effects).join("\n") || "Conversation only";
        const condition: ForgeNode = { id: outcomeId, speaker: "Condition", text: outcome.label, note: `GAME EFFECTS:\n${mechanics}`, choices: [] };
        nodes.push(condition);
        appendDialogueSequence(nodes, condition, outcomeId, outcome.effects, encounter);
      });
      return;
    }
    const firstEffectRepeatsChoice = choice.effects[0]?.kind === "bubble" && choice.effects[0].speaker === "hero" && choice.effects[0].text.trim() === choice.label.trim();
    const last = appendDialogueSequence(nodes, branch, branchId, firstEffectRepeatsChoice ? choice.effects.slice(1) : choice.effects, encounter);
    const sharedHub = choice.sharedSequence ? sharedHubs.get(choice.sharedSequence) : null;
    const reopen = choice.effects.find((effect) => effect.kind === "reopen-encounter");
    const setPhase = choice.effects.find((effect) => effect.kind === "set-flag" && phaseHubs.has(effect.flag));
    const clearsPhase = choice.effects.some((effect) => effect.kind === "clear-flag" && phaseHubs.has(effect.flag));
    const targetHub = clearsPhase
      ? choiceHub
      : setPhase?.kind === "set-flag"
        ? phaseHubs.get(setPhase.flag)
        : reopen && phaseRequirement?.kind === "flag-present"
          ? phaseHubs.get(phaseRequirement.flag)
          : null;
    if (sharedHub) last.choices.push({ id: `${branchId}-shared-continuation`, text: `Continue to ${sharedHub.text}`, nextId: sharedHub.id });
    else if (reopen && targetHub) last.choices.push({ id: `${branchId}-continue-conversation`, text: "Continue conversation", nextId: targetHub.id });
  });
  return { format: "shattered-crown-dialogue", version: 1, sourceInteractionId: encounter.kind, character: encounter.speaker, sceneTitle: encounter.title, openingNodeId: "opening", nodes };
};

const roomOrder = (room: string) => room === "bridge" ? -1 : Number.parseInt(room, 10) || 999;
const catalogOrder = (label: string) => label.startsWith("Bridge") ? -1 : Number.parseInt(label.match(/Room (\d+)/)?.[1] || "999", 10);
const nimraithFile: DialogueFile = {
  format: "shattered-crown-dialogue",
  version: 1,
  sourceInteractionId: "dead-mage",
  character: "Nimraith",
  sceneTitle: "Nimraith's Academic Suspension",
  openingNodeId: "opening",
  nodes: [
    {
      id: "opening",
      speaker: "Nimraith",
      text: "Five questions. Ask carefully.",
      note: "Room 24b · dead-mage\nThe fifth answered question releases Nimraith from the puppet strings.",
      choices: [
        ...NIMRAITH_QUESTIONS.map((question) => ({ id: `choice-${question.id}`, text: question.prompt, nextId: `question-${question.id}` })),
        { id: "choice-leave", text: "Leave", nextId: null },
      ],
    },
    ...NIMRAITH_QUESTIONS.flatMap((question): ForgeNode[] => [
      {
        id: `question-${question.id}`,
        speaker: "Player",
        text: question.prompt,
        note: `${question.item ? `REQUIREMENT: ${question.item}\n` : ""}GAME EFFECTS:\n{"kind":"set-flag","flag":"nimraith-question-${question.id}"}\nAfter the fifth answered question, Nimraith departs.`,
        choices: [{ id: `answer-${question.id}-continue`, text: "Continue", nextId: `answer-${question.id}` }],
      },
      {
        id: `answer-${question.id}`,
        speaker: "Nimraith",
        text: question.answer,
        note: question.hint ? `ITEM TRIGGER: ${question.hint}` : "",
        choices: [{ id: `answer-${question.id}-return`, text: "Ask another question", nextId: "opening" }],
      },
    ]),
  ],
};

export const DIALOGUE_CATALOG: DialogueCatalogEntry[] = [...Object.values(SCRIPTED_DUNGEON_ENCOUNTERS)
  .sort((a, b) => roomOrder(a.roomLabel) - roomOrder(b.roomLabel) || a.title.localeCompare(b.title))
  .map((encounter) => ({ id: encounter.kind, label: `${encounter.roomLabel === "bridge" ? "Bridge" : `Room ${encounter.roomLabel}`} · ${encounter.title}`, file: encounterFile(encounter) })),
  { id: "dead-mage", label: "Room 24b · Nimraith's Academic Suspension", file: nimraithFile },
].sort((a, b) => catalogOrder(a.label) - catalogOrder(b.label) || a.label.localeCompare(b.label));

export const BLANK_DIALOGUE: DialogueFile = { format: "shattered-crown-dialogue", version: 1, sourceInteractionId: "custom", character: "Character Name", sceneTitle: "New Dialogue Scene", openingNodeId: "opening", nodes: [{ id: "opening", speaker: "Character Name", text: "Opening dialogue…", note: "", choices: [] }] };
