# Dialogue Review Order

This is the ordered writing checklist for spoken dialogue, player choices, narrated text, and recurring NPC lines. Combat damage labels, movement warnings, loot notifications, and ordinary system feedback are intentionally excluded unless they need character voice.

For each scene, review: opening beat, player choices, item/trait choices, NPC responses, combat handoff, peaceful outcome, reward line, and the final repeatable line for any NPC who stays.

## Prologue

1. **Opening Forest — missing patrol and first tracks**
   - Speakers: party, wounded guard
   - Locked lines: “Hmm... looks like fresh wolf tracks... and something... bigger?”; shrine “Five old gold coins glint beneath the rubble.”; pickup “Bar money.”
   - Beats: wolf warning, on-map “One guard still breathes” bubble, compact guard-anchored conversation, then loot “a dirty ballcap” from the fallen guard; never use the old full-screen story panel
   - Item rule: inventory and ground-loot inspection expose the cap description; its internal callback identity remains Ball Cap of Bad Ideas
   - Callback opportunities: Ball Cap origin, Wolf-Touched outcome

2. **Opening Forest — poisoned meat plan**
   - Speakers: party, wolves
   - Beats: propose bait, commit to the plan, wolves eat it, victory reaction

3. **Ritual Clearing — blood-moon ritual**
   - Speakers: party, werewolves
   - Locked opening: “Sniff...” → “Smells like fresh meat.” → “Gross, did a troll cook this?”
   - Beats: inspect ritual, cleanse/disrupt choices, Wolf-Touched branch, combat handoff

4. **Village Bunker — initial refuge**
   - Speakers: party leader, villagers
   - Locked opening: “I can hear the howls getting closer. Better get ready.” → “We've barricaded ourselves in here! Protect us! They already got Jim!”
   - Beats: the party leader gives the warning, villagers explain the siege, optional questions; the Wayfarer does not appear here

5. **Village Defense — between-wave and aftermath lines**
   - Speakers: villagers, werewolf, party
   - Locked lines: first-wave aftermath “Poor Jim.”; Werewolf “Break down the doors!”; villagers offer simple thanks
   - Rule: ordinary wolves only growl unless a Wolf-Touched hero can understand them; the werewolf speaks Common
   - Beats: second-wave warning, survivor-count variations, repeatable villager lines, red potion pickups on the ground

6. **Wayfarer — road judgment**
   - Speakers: Wayfarer, party
   - Locked saved-village line: “Congratulations on saving the village. There's makings of a hero in you. Take this.”
   - Locked abandoned-village line: “I can hear the screams of the villagers. Why didn't you save them?”
   - Beats: boon or scolding, reusable teleport-away animation

7. **Bridge — toll collectors**
   - Speakers: bandit swordsman, party
   - Map beat: a normal-size broken projector at H7 wears a wooden sign reading “Pay toll ahead... Or else.”; it is click-only and has an inspection marker; stolen-supply chest remains visible; ledger removed
   - Locked choices: “The wizard over there said he'd cover our fare.”; “I'm not going to pay.”; Ball Cap: “Child support is getting expensive in the kingdom.”
   - Outcomes: wizard line succeeds only after saving the village; otherwise the guards answer “We can hear them screaming from here. What wizard? Nice try.” and attack. Refusal and Ball Cap line also start combat; the Wayfarer visibly teleports after either boon response and nobody is catapulted onto the bridge

8. **Prologue recap**
   - Speaker: narrator/Halaster as selected during review
   - Beats: summarize the party's actual choices without repeating completed conversations

## Dungeon Level 1

1. **T59/U59 — Delver Orientation**
   - Speakers: Halaster projection, party
   - Locked line: “Welcome, delvers. I’m renovating, and this level is full of freeloaders. Clear them out, and I’ll open Level Two.”
   - Beats: welcome, renovation/freeloader job, Level 1 objective, replay line

2. **M60/M61 → L59/M59 — bugbear deserters**
   - Speakers: two bugbears, party
   - Locked choices: Gold — “Here's some gold to tell us what to watch out for and to stay quiet about us being here.”; Ball Cap — “I'll let you hit me first.”; combat — “The only good bugbear is a dead one.”; Glasses — “What are you running from?”
   - Locked responses: bribe — “Paid breaks?” and both leave; Glasses — “Ghosts, bombs, monsters, traps...” → “Overbearing, two-faced bosses...” and both leave; Ball Cap and combat choices begin combat, with the bugbears acting first on the Ball Cap branch
   - Beats: keep the current deserter walk-in introduction, then show only the four locked responses
   - Callback opportunities: gold, Ball Cap, Glasses

3. **F50 (Room 5) — Grell breathing pillars**
   - Speakers: party, Grell/unknown voice
   - Beats: room observation, detect ambush, provoke them, retreat, combat handoff
   - Callback opportunities: Glasses/investigative traits

4. **P51/O47 (Room 6a/6e) — Three Lords and secret door**
   - Speaker: wall inscription/narration
   - Beats: mounted Three Lords relief, read riddle once, inspect three figures, wrong turns reset, Silent Lord opens the door

5. **N44 (Room 6c) — Extremely Secret Club**
   - Speakers: Countess Velvet, club hosts, participating hero
   - Beats: mistaken booking, consent/safe-word setup, accept/pay/fight, every station, hero reactions, surprise coffer only after completion, hosts' final line
   - Information rule: never advertise or name the reward before the final station
   - Callback opportunities: provocative clothing, confidence/recklessness traits

6. **P38 (Room 7a) — Empty Passage**
   - Removed: Hall of Retreat / Coward's Fresco. No interaction remains here.

7. **N35 doorway → Harria room (Room 8b)**
   - Speakers: Harria, flesh golem, party
   - Beats: toll demand, coin purse, inspection bluff, ask the golem what it wants, refusal/combat, Harria/golem final outcome
   - Callback opportunities: Glasses, Ball Cap, Undertaker items
   - Lore rule: Stitches remembers fragments carried by its donor bodies. “Before” means before Harria assembled it; one donor came up the stairs from a lower floor. This is not a sentient-dungeon reveal.

8. **K27 and portrait wall K25–O25 (Room 12) — Hall of Heroes**
   - Speakers: portrait captions, psychic mirror/party reflection
   - Beats: four failure portraits, mirror reaction, optional party-specific callback

9. **S24 (Room 14b) — heart beneath acid**
   - Speakers: party/Halaster only if genuinely useful
   - Beats: inspect trap, use key, force it, acid consequence, open-box reward

10. **V28 and stage (Room 16) — manticore judges**
    - Speakers: three manticore judges, contestant
    - Beats: show introduction, three questions, item/class answers, scoring commentary, first-turn verdict, combat handoff, winner/loser closing line

11. **V46 (Room 17b) — living black shroud**
    - Speakers: party, black shroud if it should speak
    - Beats: inspect statue, touch/reveal, Ball Cap bond, hostile handoff, post-bond line; bond adds a persistent cosmetic black/inky filter with no combat bonus

12. **AA24 (Room 18) — hungry troll**
    - Speakers: troll, party
    - Beats: meat demand, Fresh Meat bargain, intimidation/refusal, spigot clue, fight, repeatable satisfied line

13. **BB41/BB46 (Rooms 19a/19b) — feast halls and supplies**
    - Speaker: narration/party
    - Beats: fresh-meat discovery, tankard discovery, contextual observations only where they add information

14. **AA49 doorway → BB51 (Room 19c) — Gromm and flour ward**
    - Speakers: Gromm, party, flour-bound ghost if it communicates
    - Beats: doorway warning, explain the one-way ward first, Glasses route, Diploma adds a correct release door, Rogue repairs the break, bad-idea door empowers the ghost, Gromm's final line
    - Callback opportunities: Ball Cap, Glasses, Diploma, future ward traits

15. **O62 and Certain Death crawl — warning poster**
    - Speaker: written narration
    - Beats: one warning prompt, reveal crawl, no duplicate continue prompt

16. **J64 (Room 23a) — relic proximity bomb**
    - Speaker: party/system warning
    - Beats: adjacent arming reaction, leaving-range realization, explosion reaction, reset realization, Rogue disarm line
    - Visual rule: battered bronze magical relic presented as an out-of-place spatial glitch; no futuristic red/blue state swap and no sentient-system explanation

17. **I71 doorway → I72/J71–J73 (Room 23c) — spectral camp**
    - Speakers: Brell, Marda, Osric, party
    - Beats: cheerful invitation, toast route, Glasses route, Ball Cap route, Diploma route, realization of death, departure/final clue
    - Callback opportunities: legacy-item traits and prior Level 1 discoveries
    - Design pending: choose one concrete, useful game secret for the ghosts to reveal; do not reveal dungeon sentience

18. **H76 (Room 24a) — remedial classroom**
    - Speakers: Professor Vale/Grin, students, party
    - Beats: forced seating, class premise, quiz questions, hidden student warning, pass, fail/combat, diploma reward
    - Design pending: revisit questions and payoff in a dedicated pass

19. **H78 (Room 24b) — Nimraith's academic suspension**
    - Speakers: Nimraith, party
    - Beats: puppet introduction, five selectable questions, item-specific question, fifth-answer departure, spellbook/reward handoff

20. **W71 trigger, W70 projection, W69 obelisk (Room 28b)**
    - Speakers: princess projection, party
    - Beats: plea for help, why the message exists, replay line, interaction with the armored Blue Lightsaber display at X71 if needed

21. **W77 (Room 28d) — LOOK UP floor trap**
    - Speakers: written marking, Halaster laugh
    - Beats: wall text, floor collapse, laughter only; no extra taunt

22. **BB62 (Room 30) — mad air elemental**
    - Speakers: party/elemental only if the creature has a voice
    - Beats: arrival line and combat personality; currently primarily a fight

23. **EE69 (Room 31) — Sylvia the scavenger**
    - Speakers: Sylvia, party
    - Beats: trust pitch, Rat-Touched or Glasses exposes that she trails the gelatinous cube and scavenges its victims, corridor-wide cube warning, let her leave, threaten/fight, final line
    - Callback opportunities: Rat-Touched and investigative traits

24. **Z58 (Room 32b) — dwarven healing spigot**
    - Speaker: party/narration
    - Beats: inspect, drink/heal, Copper Tankard branch, dry-spigot conclusion

25. **AI63 inside AH62–AJ64 (Room 33) — flooding barracks**
    - Speakers: trapped hero/party
    - Beats: door seals, water rises, destroy-gate instruction, escalating reactions, drained-room conclusion

26. **HH67 doorway → II67 feast (Room 34) — one-shot teleport trap**
    - Speaker: party
    - Beats: Halleth rescue arms the threshold, first entrant is teleported to the back-wall feast, threshold goes inert, later entrants walk through normally

27. **AA66 (Room 35) — Flyndol and the rats**
    - Speakers: Flyndol, party
    - Beats: request to leave, Rat-Touched branch, Glasses branch, spare/fight, final warning

28. **GG74 (Room 36b) — Kelim behind the door**
    - Speakers: Kelim, party
    - Beats: call for help, grick threat, rescue, questions, spellbook choice, final/repeatable line if he stays

29. **U87 (Room 37) — Halleth in the pit**
    - Speakers: Halleth, party
    - Beats: call from the hole, rescue choice, route guidance, promise to matter later, departure/final line

30. **X88 (Room 39c) — starving goblins**
    - Speakers: goblin in white shirt, hungry goblin, party
    - Beats: food demand, ration bargain, Wife-Beater transfer, refusal/combat, final hungry/cold line
    - Callback opportunities: Wife-Beater and intimidation traits

31. **Z92/AA82 interaction (Room 40) — golden-spear mimic**
    - Speakers: party/mimic if desired
    - Beats: suspicious statue observation, inspection, reveal, combat handoff

32. **M63 hallway — shield guardian crossing**
    - Speaker: shield guardian
    - Beats: three repeatable patrol crossings; first is on-script, second repeats awkwardly, third questions its master and walks off script

33. **T98/V98/W98 doorways → V99 throne (Room 39a) — Two-Headed King**
    - Speakers: both king heads, party, Halaster
    - Beats: exploration-unlock roar, doorway cutscene, disguise recognition, final-practical declaration, head-specific combat barks, Wife-Beater killing-curse scene, defeat line
    - Callback opportunities: Wife-Beater, disguise traits, major Level 1 decisions

34. **V99 throne — Level 1 completion**
    - Speakers: Halaster/narrator, party
    - Beats: claim throne, outcome summary, accomplishments and casualties, open Level 2, final Level 1 send-off

## Global recurring voices

1. Halaster trap reactions: decide which traps deserve a line and prevent generic taunts from interrupting authored scenes. Halaster never comments when a bridge trap is triggered.
2. Villager repeatable lines: retain a small rotating pool after the defense.
3. Lingering NPC final lines: every NPC who stays needs exactly one deliberate repeatable line.
4. Combat barks: boss/head barks, spell calls, misses, revives, and status reactions should be reviewed after scene dialogue.
5. Legacy-item callbacks: scenes should ask for reusable traits first, then reserve unique lines for especially iconic items.
