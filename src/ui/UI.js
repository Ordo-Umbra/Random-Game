export class UI {
  constructor(onToolChange, onSpeedChange) {
    this._statAgents    = document.getElementById('stat-agents');
    this._statTick      = document.getElementById('stat-tick');
    this._statSocieties = document.getElementById('stat-societies');
    this._eventLog      = document.getElementById('event-log');

    this._lastEventTick = -1;

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

    document.getElementById('btn-normal')?.classList.add('active');
  }

  update(agentCount, tick, societyCount, recentEvents) {
    this._statAgents.textContent    = `Agents: ${agentCount}`;
    this._statTick.textContent      = `Tick: ${tick}`;
    this._statSocieties.textContent = `Societies: ${societyCount}`;

    // Show a toast for each new event
    if (recentEvents.length > 0 && recentEvents[0].tick !== this._lastEventTick) {
      this._lastEventTick = recentEvents[0].tick;
      this._showEventToast(recentEvents[0]);
    }
  }

  _showEventToast(event) {
    const toast = document.createElement('div');
    toast.className = 'event-toast';
    toast.innerHTML = `<strong>${event.name}</strong> — ${event.desc}`;
    this._eventLog.appendChild(toast);

    // Remove after animation completes
    setTimeout(() => toast.remove(), 5000);
  }
}
