import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

// Share project basename and optional session title, never full paths or messages.
export default function ompPresence(pi, { spawnProcess = spawn, platform = process.platform } = {}) {
  const directory = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'omp-presence', 'live');
  const filename = path.join(directory, `${process.pid}.json`);
  let active = false;
  let activityAt = 0;
  let lastDetails = '';
  let launchAttempted = false;

  function startCompanion() {
    if (launchAttempted || platform !== 'win32') return;
    try {
      const root = path.dirname(directory);
      if (JSON.parse(fs.readFileSync(path.join(root, 'settings.json'), 'utf8')).launchWithOmp !== true) return;
      const { executable } = JSON.parse(fs.readFileSync(path.join(root, 'launcher.json'), 'utf8'));
      if (typeof executable !== 'string' || !path.isAbsolute(executable) || !fs.existsSync(executable)) return;
      try {
        const { pid } = JSON.parse(fs.readFileSync(path.join(root, 'running.json'), 'utf8'));
        if (Number.isSafeInteger(pid) && pid > 0) {
          process.kill(pid, 0);
          launchAttempted = true;
          return;
        }
      } catch { /* The saved process has exited; start a new copy. */ }
      const child = spawnProcess(executable, [], { detached: true, stdio: 'ignore', windowsHide: true });
      child.on('error', () => { launchAttempted = false; });
      child.unref();
      launchAttempted = true;
    } catch { /* Starting presence must never interrupt OMP. */ }
  }

  function send(ctx, interacted = false) {
    if (!active) return;
    try {
      const model = ctx.models.current();
      const project = path.basename(String(ctx.cwd || '').replace(/[\\/]+$/, ''));
      const title = pi.getSessionName() || '';
      const modelId = typeof model?.id === 'string' ? model.id : '';
      const effort = String(pi.getThinkingLevel() || 'off');
      const details = JSON.stringify([project, title, modelId, effort]);
      if (interacted || details !== lastDetails) activityAt = Date.now();
      lastDetails = details;
      fs.mkdirSync(directory, { recursive: true });
      const record = { pid: process.pid, project, title, model: modelId, effort, activityAt, updatedAt: Date.now() };
      const temporary = `${filename}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(record));
      fs.renameSync(temporary, filename);
    } catch { /* Presence must never interrupt OMP. */ }
  }

  pi.on('session_start', (_event, ctx) => {
    active = true;
    startCompanion();
    send(ctx, true);
    ctx.setInterval(() => { startCompanion(); send(ctx); }, 3000);
  });
  for (const event of ['session_switch', 'session_branch', 'session_tree', 'input', 'agent_start', 'turn_start']) {
    pi.on(event, (_event, ctx) => send(ctx, true));
  }
  for (const event of ['agent_end', 'turn_end']) {
    pi.on(event, (_event, ctx) => send(ctx));
  }
  pi.on('session_shutdown', () => {
    active = false;
    try { fs.unlinkSync(filename); } catch { /* A stale heartbeat expires in the app. */ }
  });
}
