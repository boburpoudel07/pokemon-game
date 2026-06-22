# 🥄 Pokémon Spoon Eater

A browser-based Pokémon clicker game where you feed spoons to Pokémon and watch them evolve — starting with the classic Gen 1 starters and escalating to rare pseudo-legendaries!

## How to Play

- **Click anywhere** or press **Spacebar** to feed a spoon
- **Camera mode**: enable the palm detector and hold an open hand up to your webcam to trigger spoon-eating automatically
- Every 10 spoons triggers an evolution across 14 stages and 4 lines
- A **90-second timer** resets on every bite — let it expire and lose 2 spoons (and possibly devolve!)
- Hit **140 spoons** to become a Pokémon Master 🏆

## Controls

| Action | How |
|---|---|
| Feed a spoon | Click / Spacebar |
| Open palm detection | Enable camera → show ✋ |
| Skip to next evolution | ⏭ Skip Stage button |
| Pause the timer | ⏸ Break button |
| Minimize camera panel | − button on the camera panel |

## Evolution Lines

| Line | Pokémon | Spoon threshold |
|---|---|---|
| Grass | Bulbasaur → Ivysaur → Venusaur | 0 / 10 / 20 |
| Fire | Charmander → Charmeleon → Charizard | 30 / 40 / 50 |
| Water | Squirtle → Wartortle → Blastoise | 60 / 70 / 80 |
| Rare | Larvitar → Pupitar → Tyranitar → Deino → Hydreigon | 90 / 100 / 110 / 120 / 130 |

## Penalty & Demotion

When the 90-second timer expires, you lose 2 spoons. If that drop pushes you below your current evolution's threshold, you **devolve** back to the previous stage automatically.

## Running Locally

No build step needed — just open `spoon-game/index.html` in a browser.

**Optional: real spoon detection via webcam (YOLOv8)**
```bash
cd spoon-game
pip install -r requirements.txt
uvicorn server:app --port 8765
```
Then open `index.html`. The palm-detection mode works without the server.

## Tech

- Vanilla JS / CSS — no framework
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) for in-browser palm detection
- [PokéAPI sprites](https://github.com/PokeAPI/sprites) for artwork
- [YOLOv8](https://github.com/ultralytics/ultralytics) (optional) for spoon detection via webcam
