export class UI {
  constructor(onToolChange, onSpeedChange) {
    this._statAgents    = document.getElementById('stat-agents');
    this._statTick      = document.getElementById('stat-tick');
    this._statSocieties = document.getElementById('stat-societies');

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onToolChange(btn.dataset.tool);
      });
    });

    // Speed buttons
    const speedMap = { 'btn-pause': 0, 'btn-slow': 0.5, 'btn-normal': 1, 'btn-fast': 4 };
    for (const [id, speed] of Object.entries(speedMap)) {
      document.getElementById(id)?.addEventListener('click', () => {
        document.querySelectorAll('#time-controls button').forEach(b => b.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        onSpeedChange(speed);
      });
    }

    // Default active
    document.getElementById('btn-normal')?.classList.add('active');
  }

  update(agentCount, tick, societyCount) {
    this._statAgents.textContent    = `Agents: ${agentCount}`;
    this._statTick.textContent      = `Tick: ${tick}`;
    this._statSocieties.textContent = `Societies: ${societyCount}`;
  }
}
