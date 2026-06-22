# 🥄 Pokémon Spoon Eater

A browser-based Pokémon clicker game where you feed spoons to Pokémon and watch them evolve through three full evolution lines — plus a secret Ghost-type line!


## How to Play

- **Click anywhere** or press **Spacebar** to feed a spoon
- **Camera mode**: enable the palm detector and hold an open hand up to your webcam to trigger spoon-eating automatically
- Reach spoon milestones to evolve your Pokémon through 14 stages across 4 evolution lines
- A **90-second timer** resets on every bite — let it expire and lose 2 spoons!
- Hit **150 spoons** to become a Pokémon Master 🏆

## Controls

| Action | How |
|---|---|
| Feed a spoon | Click / Spacebar |
| Open palm detection | Enable camera → show ✋ |
| Skip to next evolution | ⏭ Skip Stage button |
| Pause the timer | ⏸ Break button |

## Evolution Lines

| Line | Pokémon | Starts at |
|---|---|---|
| Dragon | Dratini → Dragonair → Dragonite | 0 spoons |
| Dragon | Bagon → Shelgon → Salamence | 37 spoons |
| Dragon | Gible → Gabite → Garchomp | 73 spoons |
| Ghost | Gastly → Haunter → Gengar → Misdreavus → Mismagius | 100 spoons |

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
