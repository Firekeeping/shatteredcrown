"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DialogueEditor.module.css";
import { BLANK_DIALOGUE, DIALOGUE_CATALOG, type DialogueFile, type ForgeChoice as Choice, type ForgeNode as Node } from "./dialogue-forge-catalog";

const legacyDraftKey = "shattered-crown-dialogue-forge-v1", lastInteractionKey = "shattered-crown-dialogue-forge-last", defaultInteraction = "paranoid-dwarf";
const catalogRevision: Partial<Record<string, number>> = {
  "bridge-bandits": 4,
  "pillar-bugbears": 3,
  "secret-club": 4,
  "manticore-show": 3,
  "undertakers-harria": 3,
  "starving-goblins": 3,
  "troll": 3,
  "halleth-bard": 3,
  "flyndol": 3,
  "spectral-camp": 3,
  "dead-mage": 4,
};
const draftKey = (interactionId: string) => `shattered-crown-dialogue-forge-v${catalogRevision[interactionId] || 2}:${interactionId}`;
const catalogFile = (interactionId: string) => structuredClone(DIALOGUE_CATALOG.find((entry) => entry.id === interactionId)?.file || BLANK_DIALOGUE);
const label = (node: Node) => `${node.speaker || "Unknown"}: ${node.text.trim().slice(0, 34) || "Empty line"}${node.text.length > 34 ? "…" : ""}`;
const responseText = (choice: Choice, nodes: Node[]) => { const written = choice.text.trim(); if (written && written.toLowerCase() !== "new response") return written; const target = nodes.find((node) => node.id === choice.nextId); return target?.speaker.trim().toLowerCase() === "player" && target.text.trim() ? target.text.trim() : "Continue"; };

function Tree({ id, nodes, selected, choose, trail = new Set<string>() }: { id: string; nodes: Node[]; selected: string; choose: (id: string) => void; trail?: Set<string> }) {
  const node = nodes.find((item) => item.id === id);
  if (!node) return <span className={styles.end}>MISSING</span>;
  if (trail.has(id)) return <button className={styles.loop} onClick={() => choose(id)}>↩ {node.speaker}</button>;
  const nextTrail = new Set(trail).add(id);
  return <div className={styles.tree}>
    <button className={`${styles.node} ${selected === id ? styles.selected : ""}`} onClick={() => choose(id)}><small>{id === "opening" ? "OPENING · " : ""}{node.speaker || "UNNAMED"}</small><b>{node.text || "Write this dialogue…"}</b><em>{node.choices.length ? `${node.choices.length} RESPONSES` : "ENDS HERE"}</em></button>
    {!!node.choices.length && <div className={styles.children}>{node.choices.map((choice) => <div className={styles.path} key={choice.id}><span>{responseText(choice, nodes)}</span>{choice.nextId ? <Tree id={choice.nextId} nodes={nodes} selected={selected} choose={choose} trail={nextTrail} /> : <i className={styles.end}>END</i>}</div>)}</div>}
  </div>;
}

function Script({ id, nodes, trail = new Set<string>(), depth = 0 }: { id: string; nodes: Node[]; trail?: Set<string>; depth?: number }) {
  const node = nodes.find((item) => item.id === id);
  if (!node) return null;
  if (trail.has(id)) return <p className={styles.scriptReturn} style={{ marginLeft: depth * 20 }}>↩ Return to {node.speaker}</p>;
  const nextTrail = new Set(trail).add(id);
  return <section className={styles.scriptBlock} style={{ marginLeft: depth * 20 }}><p><b>{node.speaker || "Unnamed speaker"}</b> — “{node.text || "…"}”</p>{node.note && <small>{node.note}</small>}{node.choices.map((choice, index) => <div key={choice.id}><em>{index + 1}. {responseText(choice, nodes)}</em>{choice.nextId ? <Script id={choice.nextId} nodes={nodes} trail={nextTrail} depth={depth + 1} /> : <span>END</span>}</div>)}</section>;
}

export default function DialogueEditor({ onExit }: { onExit: () => void }) {
  const [interactionId, setInteractionId] = useState(defaultInteraction), [data, setData] = useState<DialogueFile>(() => catalogFile(defaultInteraction)), [selectedId, setSelectedId] = useState("opening"), [view, setView] = useState<"map" | "script">("map"), [message, setMessage] = useState("Each interaction autosaves separately on this device.");
  const [history, setHistory] = useState<DialogueFile[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const importRef = useRef<HTMLInputElement>(null), counter = useRef(10);
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const remembered = window.localStorage.getItem(lastInteractionKey) || defaultInteraction;
        const known = remembered === "custom" || DIALOGUE_CATALOG.some((entry) => entry.id === remembered);
        const nextId = known ? remembered : defaultInteraction;
        const saved = window.localStorage.getItem(draftKey(nextId)) || (nextId === "custom" ? window.localStorage.getItem(legacyDraftKey) : null);
        const next = saved ? JSON.parse(saved) as DialogueFile : catalogFile(nextId);
        setInteractionId(nextId);
        setData(next);
        setSelectedId(next.openingNodeId);
        setMessage(`Opened ${next.sceneTitle}.`);
      } catch {
        // Keep the built-in interaction when storage is unavailable or corrupt.
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(interactionId), JSON.stringify(data));
        window.localStorage.setItem(lastInteractionKey, interactionId);
      } catch {
        // Editing still works when browser storage is unavailable.
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [data, interactionId, storageReady]);
  const selected = data.nodes.find((node) => node.id === selectedId) || data.nodes[0];
  const payload = useMemo(() => JSON.stringify({ ...data, nodes: data.nodes.map((node) => ({ ...node, choices: node.choices.map((choice) => ({ ...choice, text: responseText(choice, data.nodes) })) })) }, null, 2), [data]);
  const remember = () => setHistory((current) => {
    const snapshot = structuredClone(data), prior = current.at(-1);
    if (prior && JSON.stringify(prior) === JSON.stringify(snapshot)) return current;
    return [...current.slice(-49), snapshot];
  });
  const undo = () => setHistory((current) => {
    const previous = current.at(-1);
    if (!previous) return current;
    setData(structuredClone(previous));
    setSelectedId(previous.openingNodeId);
    setMessage("Undid the last Dialogue Forge edit.");
    return current.slice(0, -1);
  });
  const selectInteraction = (nextId: string) => { localStorage.setItem(draftKey(interactionId), JSON.stringify(data)); const saved = localStorage.getItem(draftKey(nextId)), next = saved ? JSON.parse(saved) as DialogueFile : catalogFile(nextId); setInteractionId(nextId); setData(next); setHistory([]); setSelectedId(next.openingNodeId); setMessage(`Opened ${next.sceneTitle}. Your other drafts remain saved.`); };
  const patchNode = (patch: Partial<Node>) => setData((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === selected.id ? { ...node, ...patch } : node) }));
  const patchChoice = (id: string, patch: Partial<Choice>) => patchNode({ choices: selected.choices.map((choice) => choice.id === id ? { ...choice, ...patch } : choice) });
  const addResponse = () => { remember(); const n = counter.current++, id = `node-${n}`, choice = { id: `choice-${n}`, text: "", nextId: id }; setData((current) => ({ ...current, nodes: [...current.nodes.map((node) => node.id === selected.id ? { ...node, choices: [...node.choices, choice] } : node), { id, speaker: "Player", text: "", note: "", choices: [] }] })); setSelectedId(id); };
  const deleteNode = () => { if (selected.id === data.openingNodeId) return; remember(); setData((current) => ({ ...current, nodes: current.nodes.filter((node) => node.id !== selected.id).map((node) => ({ ...node, choices: node.choices.map((choice) => choice.nextId === selected.id ? { ...choice, nextId: null } : choice) })) })); setSelectedId(data.openingNodeId); };
  const exportFile = () => { const blob = new Blob([payload], { type: "application/json" }), url = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = url; anchor.download = `${data.sceneTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dialogue"}.json`; anchor.click(); URL.revokeObjectURL(url); setMessage("Dialogue exported. Attach that JSON here and tell me where it belongs."); };
  const importFile = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as DialogueFile; if (!parsed.nodes?.length || !parsed.openingNodeId) throw Error(); const matched = parsed.sourceInteractionId && DIALOGUE_CATALOG.some((entry) => entry.id === parsed.sourceInteractionId) ? parsed.sourceInteractionId : "custom", next = { ...parsed, format: "shattered-crown-dialogue" as const, version: 1 as const, sourceInteractionId: matched }; setInteractionId(matched); setData(next); setHistory([]); setSelectedId(next.openingNodeId); setMessage(`Imported ${next.sceneTitle}.`); } catch { setMessage("That is not a valid Shattered Crown dialogue file."); } }; reader.readAsText(file); };
  const reset = () => { if (!confirm("Start a new custom dialogue? Your existing interaction drafts remain saved.")) return; const blank = structuredClone(BLANK_DIALOGUE); setInteractionId("custom"); setData(blank); setHistory([]); setSelectedId("opening"); };
  const resetToDefault = () => { if (!confirm(`Reset ${data.sceneTitle} to the built-in default?`)) return; remember(); localStorage.removeItem(draftKey(interactionId)); const next = catalogFile(interactionId); setData(next); setSelectedId(next.openingNodeId); setMessage(`${next.sceneTitle} was reset to its built-in default. Undo is still available.`); };
  return <main className={styles.shell}>
    <header><div><p>SHATTERED CROWN · DIALOGUE FORGE</p><h1>{data.sceneTitle}</h1></div><nav><button onClick={onExit}>← Game Menu</button><button onClick={undo} disabled={!history.length}>Undo</button><button onClick={resetToDefault}>Reset to Default</button><button onClick={() => importRef.current?.click()}>Import</button><button onClick={reset}>New</button><button className={styles.primary} onClick={exportFile}>Export Dialogue</button></nav></header>
    <section className={styles.identity}><label className={styles.interactionPicker}>INTERACTION<select value={interactionId} onChange={(event) => selectInteraction(event.target.value)}><option value="custom">Custom Dialogue</option>{DIALOGUE_CATALOG.map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</select></label><label>CHARACTER NAME<input value={data.character} onFocus={remember} onChange={(event) => setData({ ...data, character: event.target.value })} /></label><label>SCENE TITLE<input value={data.sceneTitle} onFocus={remember} onChange={(event) => setData({ ...data, sceneTitle: event.target.value })} /></label><label>OPENING DIALOGUE<textarea value={data.nodes.find((node) => node.id === data.openingNodeId)?.text || ""} onFocus={remember} onChange={(event) => setData({ ...data, nodes: data.nodes.map((node) => node.id === data.openingNodeId ? { ...node, text: event.target.value } : node) })} /></label></section>
    <div className={styles.workspace}>
      <section className={styles.canvas}><div className={styles.toolbar}><div><small>BRANCH OVERVIEW</small><b>{data.nodes.length} dialogue nodes</b></div><div><button className={view === "map" ? styles.active : ""} onClick={() => setView("map")}>Branch Map</button><button className={view === "script" ? styles.active : ""} onClick={() => setView("script")}>Readable Script</button></div></div><div className={view === "map" ? styles.map : styles.script}>{view === "map" ? <Tree id={data.openingNodeId} nodes={data.nodes} selected={selected.id} choose={setSelectedId} /> : <Script id={data.openingNodeId} nodes={data.nodes} />}</div><footer>{message}</footer></section>
      <aside className={styles.inspector}><div className={styles.inspectorTitle}><div><small>SELECTED NODE</small><h2>{selected.id === data.openingNodeId ? "Opening" : label(selected)}</h2></div>{selected.id !== data.openingNodeId && <button onClick={deleteNode}>Delete</button>}</div>
        <label>SPEAKER<input value={selected.speaker} onFocus={remember} onChange={(event) => patchNode({ speaker: event.target.value })} /></label><label>DIALOGUE<textarea className={styles.dialogue} value={selected.text} onFocus={remember} onChange={(event) => patchNode({ text: event.target.value })} /></label><label>WRITER NOTE / CONDITION<textarea value={selected.note} onFocus={remember} onChange={(event) => patchNode({ note: event.target.value })} placeholder="Trigger, reward, animation, condition…" /></label>
        <div className={styles.responseHead}><div><b>PLAYER RESPONSES</b><small>{selected.choices.length} branches</small></div><button className={styles.primary} onClick={addResponse}>+ Add response</button></div>
        <div className={styles.responses}>{!selected.choices.length && <p className={styles.empty}>This branch ends here.<br />Add a response to continue it.</p>}{selected.choices.map((choice, index) => <div className={styles.response} key={choice.id}><i>{index + 1}</i><input value={choice.text} onFocus={remember} onChange={(event) => patchChoice(choice.id, { text: event.target.value })} /><select value={choice.nextId || "__end"} onFocus={remember} onChange={(event) => patchChoice(choice.id, { nextId: event.target.value === "__end" ? null : event.target.value })}><option value="__end">End conversation</option>{data.nodes.filter((node) => node.id !== selected.id).map((node) => <option value={node.id} key={node.id}>{label(node)}</option>)}</select><button onClick={() => { remember(); patchNode({ choices: selected.choices.filter((item) => item.id !== choice.id) }); }}>×</button></div>)}</div>
      </aside>
    </div><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
  </main>;
}
