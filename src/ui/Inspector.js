import { STRUCTURE_DEF, SeedType } from '../knowledge/Structure.js';
import { STRUCTURE_BUILD_DEF } from '../world/PlacedStructure.js';
import { ANIMAL_DEF }          from '../animals/Animal.js';

export class Inspector {
  constructor() {
    this._panel  = document.getElementById('inspector');
    this._title  = document.getElementById('inspector-title');
    this._body   = document.getElementById('inspector-body');
    this._closeBtn = document.getElementById('inspector-close');

    this._closeBtn.addEventListener('click', () => this.hide());
  }

  hide() {
    this._panel.classList.add('hidden');
  }

  showAgent(agent, societies) {
    this._panel.classList.remove('hidden');
    this._title.textContent = `Agent #${agent.id}`;

    const society = agent.societyId !== null
      ? societies.get(agent.societyId)
      : null;

    const known  = agent.corpus.snapshot();
    const kappa  = agent.kappa;
    const { sC, sI, S, knownCount, total } = agent.corpus.computeS(kappa);

    this._body.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-label">Status</div>
        <div>Age: ${agent.age} / ${agent.lifespan}</div>
        <div>Position: (${agent.x}, ${agent.y})</div>
        <div>Society: ${society ? `Group #${agent.societyId} (${society.members.size} members)` : 'None'}</div>
        <div>Reproduce: ${agent.canReproduce ? '✓ ready' : agent.reproduceCooldown > 0 ? `cooldown ${agent.reproduceCooldown}` : agent.age < agent.minReproduceAge ? `too young (${agent.minReproduceAge - agent.age})` : 'needs not met'}</div>
      </div>

      <div class="inspector-section">
        <div class="inspector-label">Needs</div>
        ${needBar('Hunger', agent.hunger, 'hunger')}
        ${needBar('Energy', agent.energy, 'energy')}
        ${needBar('Social', agent.social,  'social')}
      </div>

      <div class="inspector-section">
        <div class="inspector-label">Inventory</div>
        <div style="display:flex;gap:12px;font-size:12px">
          <span>Wood <b style="color:#c8a050">${agent.inventory.wood}</b>/8</span>
          <span>Stone <b style="color:#aaaacc">${agent.inventory.stone}</b>/8</span>
        </div>
        <div style="color:#666;font-size:11px;margin-top:3px">${agent.builder.activity}</div>
      </div>

      <div class="inspector-section">
        <div class="inspector-label">Emergence Score  S = ΔC + κ·ΔI</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:#aaa;margin-bottom:4px">
          <span>κ <b style="color:#fff">${Math.round(kappa * 100)}%</b></span>
          <span>ΔC <b style="color:#fff">${knownCount}/${total}</b></span>
          <span>ΔI <b style="color:#fff">${Math.round(sI * 100)}%</b></span>
        </div>
        ${needBar('S', Math.min(1, S / 2), 'social')}
        <div style="color:#ffd97d;font-size:12px;margin-top:2px">S = ${S.toFixed(3)}</div>
      </div>

      <div class="inspector-section">
        <div class="inspector-label">Corpus (${known.length} structures)</div>
        ${known.length === 0
          ? '<div style="color:#666;font-style:italic">No knowledge yet</div>'
          : known.map(({ id, mastery }) => knowledgeBar(id, mastery)).join('')
        }
      </div>

      ${society ? `
      <div class="inspector-section">
        <div class="inspector-label">Society Knowledge</div>
        ${society.sharedKnowledge.map(id => `
          <div style="color:#8abaff;font-size:11px">✓ ${STRUCTURE_DEF[id]?.name ?? id}</div>
        `).join('') || '<div style="color:#666;font-style:italic">None shared yet</div>'}
      </div>` : ''}
    `;
  }

  showAnimal(animal) {
    this._panel.classList.remove('hidden');
    const def = ANIMAL_DEF[animal.type];
    this._title.textContent = `${def.name} #${animal.id}`;
    this._body.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-label">Status</div>
        <div>State: ${animal.state}</div>
        <div>Age: ${animal.age}</div>
        <div>Position: (${animal.x}, ${animal.y})</div>
      </div>
      <div class="inspector-section">
        <div class="inspector-label">Health</div>
        ${needBar('Health', animal.health / animal.maxHealth, 'energy')}
      </div>
    `;
  }

  showSkeleton(skeleton, currentTick) {
    this._panel.classList.remove('hidden');
    const label = skeleton.isAgent
      ? `Agent #${skeleton.agentId}`
      : ANIMAL_DEF[skeleton.sourceType]?.name ?? skeleton.sourceType;
    this._title.textContent = `Remains of ${label}`;

    const decayPct = Math.round(skeleton.decayFraction(currentTick) * 100);
    const known    = skeleton.corpusSnapshot;

    this._body.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-label">Record</div>
        <div>Type: ${skeleton.sourceType}</div>
        ${skeleton.isAgent ? `<div>Lived: ${skeleton.agentAge} ticks</div>` : ''}
        <div>Died: tick ${skeleton.diedAt}</div>
        <div>Decay: ${decayPct}%</div>
      </div>
      ${known.length > 0 ? `
      <div class="inspector-section">
        <div class="inspector-label">Knowledge at Death</div>
        ${known.map(({ id, mastery }) => knowledgeBar(id, mastery)).join('')}
      </div>` : ''}
    `;
  }

  showTile(x, y, tile, structure) {
    this._panel.classList.remove('hidden');
    this._title.textContent = `Tile (${x}, ${y})`;
    this._body.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-label">Terrain</div>
        <div>Type: ${tile.type.replace(/_/g, ' ')}</div>
        <div>Elevation: ${(tile.elevation * 100).toFixed(0)}%</div>
        <div>Moisture: ${(tile.moisture * 100).toFixed(0)}%</div>
        <div>Resource: ${tile.resource ?? 'none'}</div>
        <div>Passable: ${tile.passable ? 'yes' : 'no'}</div>
      </div>
      ${structure ? `
      <div class="inspector-section">
        <div class="inspector-label">Structure</div>
        <div>${STRUCTURE_BUILD_DEF[structure.type]?.name ?? structure.type}</div>
        ${needBar('Health', structure.healthFraction, 'energy')}
        <div style="color:#888;font-size:11px">Built tick ${structure.builtAt} · by agent #${structure.builtBy}</div>
      </div>` : ''}
    `;
  }
}

function needBar(label, value, cls) {
  const pct = Math.round(value * 100);
  return `
    <div class="need-row">
      <span class="need-label">${label}</span>
      <div class="need-track">
        <div class="need-fill ${cls}" style="width:${pct}%"></div>
      </div>
      <span style="color:#888;font-size:11px">${pct}%</span>
    </div>`;
}

const SEED_COLOR = {
  [SeedType.U1]:  '#7eb8ff',
  [SeedType.SU2]: '#ffaa55',
  [SeedType.SU3]: '#77dd88',
  [SeedType.NONE]: '#666',
};

function knowledgeBar(id, mastery) {
  const def  = STRUCTURE_DEF[id];
  const name = def?.name ?? id;
  const pct  = Math.round(mastery * 100);
  const seed = def?.seedType ?? SeedType.NONE;
  const col  = SEED_COLOR[seed] ?? '#666';
  const badge = seed !== SeedType.NONE
    ? `<span style="color:${col};font-size:9px;font-weight:bold;margin-left:3px">${seed}</span>`
    : '';
  return `
    <div class="knowledge-bar">
      <span class="knowledge-bar-name">${name}${badge}</span>
      <div class="knowledge-bar-track">
        <div class="knowledge-bar-fill" style="width:${pct}%"></div>
      </div>
      <span style="color:#888;font-size:11px">${pct}%</span>
    </div>`;
}
