'use strict';
const fs = require('node:fs');
const path = require('node:path');

const MAX_AGE_MS = 12000;
function clean(value, max = 80) {
  return String(value || '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function readLive(directory, now = Date.now()) {
  let latest = null;
  let files = [];
  try { files = fs.readdirSync(directory).filter((file) => /^\d+\.json$/.test(file)); } catch { return null; }
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
      if (String(data.pid) !== file.slice(0, -5) || !Number.isFinite(data.updatedAt) ||
          data.updatedAt > now + 2000 || now - data.updatedAt > MAX_AGE_MS) continue;
      const activityAt = Number.isFinite(data.activityAt) && data.activityAt >= 0 && data.activityAt <= now + 2000 ? data.activityAt : 0;
      if (!latest || activityAt > latest.activityAt || (activityAt === latest.activityAt && data.updatedAt > latest.updatedAt)) {
        latest = { project: clean(data.project, 48), title: clean(data.title, 64), model: clean(data.model, 60), effort: clean(data.effort, 24), activityAt, updatedAt: data.updatedAt };
      }
    } catch { /* Ignore partial or invalid files. */ }
  }
  return latest;
}
function presence(session, settings, startedAt) {
  if (!session || settings.pause) return null;
  const model = settings.showModel ? clean(session.model, 60) : '';
  const effort = settings.showEffort ? clean(session.effort, 24) : '';
  const userName = clean(settings.userName, 30);
  const details = [model, effort && effort !== 'off' ? `${effort} effort` : '', userName].filter(Boolean).join(' · ') || 'Using OMP';
  const project = clean(session.project, 48);
  const title = settings.showTitle ? clean(session.title, 64) : '';
  const state = [project, title].filter(Boolean).join(': ') || 'Using OMP';
  const activity = { type: 0, details, state, assets: { large_image: 'logo', large_text: 'OMP' } };
  if (settings.showElapsed && startedAt) activity.timestamps = { start: startedAt };
  return activity;
}
module.exports = { readLive, presence, clean };
