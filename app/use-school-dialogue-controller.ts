import { useRef, type Dispatch, type SetStateAction } from "react";
import { SCHOOL_QUIZ_QUESTIONS } from "./scene-content";
import type { SocialScene } from "./game-types";

type Setter<T> = Dispatch<SetStateAction<T>>;

export const useSchoolDialogueController = ({
  scene,
  setScene,
  setStep,
  setMistakes,
  setFlash,
  setFlags,
  setAmbient,
  setLog,
}: {
  scene: SocialScene | null;
  setScene: Setter<SocialScene | null>;
  setStep: Setter<number | null>;
  setMistakes: Setter<number>;
  setFlash: Setter<boolean>;
  setFlags: Setter<string[]>;
  setAmbient: Setter<string | null>;
  setLog: Setter<string[]>;
}) => {
  const glimpseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSchoolGlimpse = () => {
    if (glimpseTimerRef.current) clearTimeout(glimpseTimerRef.current);
    glimpseTimerRef.current = null;
  };
  const startSchoolQuiz = (initialMistakes = 0) => {
    if (scene?.kind !== "schoolteacher") return;
    setStep(0);
    setMistakes(initialMistakes);
    setScene((current) => current?.kind === "schoolteacher"
      ? { ...current, speaker: "Professor Vale", text: SCHOOL_QUIZ_QUESTIONS[0].prompt }
      : current);
  };
  const showProfessorGrinGlimpse = (
    text: string,
    returnText: string,
    speaker: "Professor Vale" | "Professor Grin" = "Professor Grin",
  ) => {
    clearSchoolGlimpse();
    setFlash(true);
    setScene((current) => current?.kind === "schoolteacher" ? { ...current, speaker, text } : current);
    setFlags((events) => [...new Set([...events, "school-grin-teased"])]);
    setAmbient("FOR ONE MOMENT, PROFESSOR VALE'S SMILE STRETCHES TOO WIDE");
    glimpseTimerRef.current = setTimeout(() => {
      glimpseTimerRef.current = null;
      setFlash(false);
      setAmbient(null);
      setScene((current) => current?.kind === "schoolteacher"
        ? { ...current, speaker: "Professor Vale", text: returnText }
        : current);
    }, 1400);
  };
  const questionProfessorValeCurriculum = () => {
    if (scene?.kind !== "schoolteacher") return;
    setStep(0);
    setMistakes(1);
    showProfessorGrinGlimpse(
      "Mathematics, natural philosophy, and the discipline to think before touching suspicious objects. You were expected to remember.",
      SCHOOL_QUIZ_QUESTIONS[0].prompt,
      "Professor Vale",
    );
    setLog((lines) => ["Questioning Professor Vale's curriculum counts as the first missed answer. Her smile briefly belongs to Professor Grin, and the class begins.", ...lines].slice(0, 6));
  };
  return { clearSchoolGlimpse, questionProfessorValeCurriculum, showProfessorGrinGlimpse, startSchoolQuiz };
};
