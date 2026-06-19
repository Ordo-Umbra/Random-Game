import { STRUCTURE_DEF } from '../knowledge/Structure.js';

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

    const known = agent.corpus.snapshot();

    this._body.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-label">Status</div>
        <div>Age: ${agent.age} / ${agent.lifespan}</div>
        <div>Position: (${agent.x}, ${agent.y})</div>
        <div>Society: ${society ? `Group #${agent.societyId} (${society.members.size} members)` : 'None'}</div>
      </div>

      <div class="inspector-section">
        <div class="inspector-label">Needs</div>
        ${needBar('Hunger', agent.hunger, 'hunger')}
        ${needBar('Energy', agent.energy, 'energy')}
        ${needBar('Social', agent.social,  'social')}
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

  showTile(x, y, tile) {
    this._panel.classList.remove('hidden');
    this._title.textContent = `Tile (${x}, ${y})`;
    this._body.innerHTML = `
      <div class="inspector-section">
        <div class="inspector-label">Terrain</div>
        <div>Type: ${tile.type.replace('_', ' ')}</div>
        <div>Elevation: ${(tile.elevation * 100).toFixed(0)}%</div>
        <div>Moisture: ${(tile.moisture * 100).toFixed(0)}%</div>
        <div>Resource: ${tile.resource ?? 'none'}</div>
        <div>Passable: ${tile.passable ? 'yes' : 'no'}</div>
      </div>
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

function knowledgeBar(id, mastery) {
  const name = STRUCTURE_DEF[id]?.name ?? id;
  const pct  = Math.round(mastery * 100);
  return `
    <div class="knowledge-bar">
      <span class="knowledge-bar-name">${name}</span>
      <div class="knowledge-bar-track">
        <div class="knowledge-bar-fill" style="width:${pct}%"></div>
      </div>
      <span style="color:#888;font-size:11px">${pct}%</span>
    </div>`;
}
