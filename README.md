# Emergent Worlds

A browser-based isometric sandbox simulation where agents don't just survive — they **learn, teach, forget, and build cultures**.

## Concept

Most sandbox games let you watch creatures fight over resources. This one asks a different question: **what happens when knowledge itself is the resource?**

Agents discover "stable structures" — techniques, tools, buildings, social patterns — and carry them as a living corpus. They can teach what they know, forget what they don't use, and lose knowledge entirely if no one passes it on. Societies emerge not from scripted factions but from clusters of shared understanding. A group that knows how to farm and smelt is fundamentally different from one that only knows how to hunt — and they'll behave that way.

The world is shaped less by what you do (though you have powers) and more by what agents collectively remember.

## Core Ideas

### Knowledge as Survival
- Each agent carries a personal **corpus** — a set of understood structures (fire-making, shelter-building, crop tending, tool-forging, etc.)
- Knowledge is probabilistic: an agent might partially understand something, making them unreliable teachers
- Agents forget unused knowledge over time (use it or lose it)

### Emergence at Multiple Levels
1. **Individual** — An agent learns to make fire through trial and error or by watching others
2. **Group** — Clusters of agents with overlapping knowledge form proto-societies with shared behavior
3. **Cultural** — Some knowledge becomes entrenched in a group's "corpus memory," stabilizing it even as individual agents come and go
4. **Civilizational** — Accumulated stable structures unlock new possibility spaces (knowing metallurgy + knowing architecture = stone fortresses)

### Knowledge Transmission
- Agents in proximity can teach each other — but only what they actually know
- Teaching fidelity depends on the teacher's mastery level
- Lost knowledge can be rediscovered (slowly) through environmental interaction
- If the last agent who knows how to smelt iron dies without passing it on, **that knowledge is gone**

### The World Responds
- Terrain is shaped by agent activity over time (forests cleared, rivers diverted, fields cultivated)
- Structures agents build persist and degrade, giving future agents physical evidence of prior civilizations
- Climate and resources shift, forcing adaptation — groups that can't adapt (or teach adaptation) collapse

## How It Differs from WorldBox

| WorldBox | Emergent Worlds |
|---|---|
| Factions are scripted | Groups form purely from agent clustering |
| Knowledge is innate per species | Knowledge is learned, taught, and losable |
| God powers are the main mechanic | Agent emergence is the main mechanic |
| Pixel art, top-down | Isometric, tile-based |
| Races have fixed traits | Agents have individual knowledge profiles |

## Tech Stack

- **HTML5 Canvas** — isometric tile rendering
- **Vanilla JavaScript (ES modules)** — no framework overhead, runs anywhere
- **GitHub Pages** — no install, just open in browser

## Project Structure

```
index.html                  — Entry point
style.css                   — Layout and UI chrome
src/
  main.js                   — Game loop and initialization
  world/
    World.js                — Tile grid and world state
    Tile.js                 — Tile types and properties
    TerrainGen.js           — Procedural terrain generation
  renderer/
    IsometricRenderer.js    — Iso projection math and draw calls
    Camera.js               — Pan and zoom
  agents/
    Agent.js                — Agent state, needs, position
    Brain.js                — Decision-making and behavior
    Corpus.js               — Personal knowledge set per agent
  knowledge/
    Structure.js            — A learnable/teachable stable structure
    KnowledgeRegistry.js    — All structures that exist in this world
    Transmission.js         — Teaching and learning mechanics
  societies/
    Society.js              — Emergent group tracking
    CulturalMemory.js       — Group-level corpus stabilization
  ui/
    UI.js                   — HUD and overlays
    Inspector.js            — Click-to-inspect agents and tiles
assets/
  tiles/                    — Tile sprites (procedural to start)
```

## Roadmap

- [ ] Isometric world renderer with basic terrain
- [ ] Procedural terrain generation (elevation, biomes, water)
- [ ] Agents with movement and basic needs (hunger, rest)
- [ ] Knowledge corpus system — structures, mastery levels, forgetting
- [ ] Knowledge transmission — teaching, learning fidelity
- [ ] Group emergence — societies from shared corpus overlap
- [ ] Physical structures — agents building persistent objects
- [ ] Cultural memory — group-level knowledge stabilization
- [ ] God powers — place terrain, spawn agents, trigger events
- [ ] Time controls — pause, speed up, slow down
- [ ] Inspector UI — click any agent to see their corpus, relationships, history

## Running

Open `index.html` in any modern browser. No build step required.

For local development (avoids CORS issues with ES module imports):
```bash
npx serve .
# or
python3 -m http.server 8080
```
