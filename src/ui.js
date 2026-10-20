'use strict';
const $ = (id) => document.getElementById(id);
const fields = ['userName', 'showTitle', 'showModel', 'showEffort', 'showElapsed', 'launchWithOmp'];
const revisions = Object.fromEntries(fields.map((key) => [key, 0]));
const dirty = new Set();
let current;
let receivedSnapshot = false;

function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).classList.toggle('error', error);
}
function errorText(error) {
  return String(error?.message || error).replace(/^.*Error: /, '');
}
function showView(next) {
  $('home-view').hidden = next !== 'home';
  $('settings-view').hidden = next !== 'settings';
  for (const name of ['home', 'settings']) {
    const button = $(`${name}-nav`);
    if (name === next) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $(`${next}-title`).focus();
}
function syncFields(settings) {
  for (const key of fields) {
    if (dirty.has(key)) continue;
    const field = $(key);
    if (field.type === 'checkbox') field.checked = Boolean(settings[key]);
    else field.value = settings[key] || '';
  }
}
function updateElapsed() {
  const active = current?.session && current.discord === 'connected' && !current.settings.pause;
  const startedAt = Number(current?.startedAt);
  const visible = Boolean(active && current.settings.showElapsed && startedAt > 0);
  $('preview-time').hidden = !visible;
  if (!visible) return;
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - startedAt);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  $('preview-time').textContent = `Elapsed ${hours}:${String(minutes).padStart(2, '0')}`;
}
function renderPreview(data) {
  const active = Boolean(data.session && data.discord === 'connected' && !data.settings.pause);
  const badge = $('preview-badge');
  badge.textContent = active ? 'Live' : data.settings.pause ? 'Paused' : 'Not sharing';
  badge.classList.toggle('on', active);
  $('preview-dot').classList.toggle('on', active);
  $('preview-type').textContent = active ? 'PLAYING A GAME' : 'NOT SHARING';
  $('preview-name').textContent = active ? 'OMP' : 'No activity to show';
  const effort = data.settings.showEffort && data.session?.effort && data.session.effort !== 'off' ? `${data.session.effort} effort` : '';
  $('preview-details').textContent = active
    ? [data.settings.showModel ? data.session.model : '', effort, data.settings.userName?.trim()].filter(Boolean).join(' · ') || 'Using OMP'
    : data.settings.pause ? 'Presence is paused' : data.discord !== 'connected' ? 'Discord is not connected' : 'Waiting for OMP';
  $('preview-state').hidden = !active;
  if (active) $('preview-state').textContent = [data.session.project, data.settings.showTitle ? data.session.title : ''].filter(Boolean).join(': ') || 'Using OMP';
  const setupAction = data.extensionStatus === 'outdated' ? 'Update the OMP extension' : data.extensionStatus === 'custom' ? 'Check the OMP extension' : 'Install the OMP extension';
  const olderSession = data.session && data.session.source !== 'process' && !data.session.activityAt;
  $('preview-caption').textContent = data.settings.pause ? 'Presence paused' : data.discord !== 'connected' ? 'Reconnect Discord to share your activity' : data.session?.source === 'session' ? 'Restart OMP to add live model and effort' : data.session?.source === 'process' ? 'Restart OMP for project and model' : data.extensionStatus === 'outdated' ? 'Update the extension for project and chat title' : olderSession ? 'Restart OMP for project and chat title' : data.session ? 'OMP is sending live details' : data.extensionInstalled ? 'Start or restart OMP' : setupAction;
  updateElapsed();
}
function render(data) {
  current = data;
  syncFields(data.settings);
  const setupAction = data.extensionStatus === 'outdated' ? 'Update OMP extension' : data.extensionStatus === 'custom' ? 'Check OMP extension' : 'Install OMP extension';
  const olderSession = data.session && data.session.source !== 'process' && !data.session.activityAt;
  $('omp-status').textContent = data.session?.source === 'session' ? 'Project and chat title found' : data.session?.source === 'process' ? 'Running · restart OMP' : data.extensionStatus === 'outdated' ? setupAction : olderSession ? 'Restart OMP for project' : data.session ? 'Live metadata received' : data.extensionInstalled ? 'Start or restart OMP' : setupAction;
  $('omp-dot').classList.toggle('on', Boolean(data.session));
  const statuses = { connected: 'Connected', connecting: 'Connecting…', 'discord-closed': 'Open Discord desktop', 'app-id-needed': 'OMP identity unavailable', 'rpc-error': 'Connection rejected', disconnected: 'Disconnected' };
  $('discord-status').textContent = statuses[data.discord] || data.discord || 'Checking…';
  $('discord-dot').classList.toggle('on', data.discord === 'connected');
  $('pause').textContent = data.settings.pause ? 'Resume presence' : 'Pause presence';
  $('pause').setAttribute('aria-pressed', String(Boolean(data.settings.pause)));
  renderPreview(data);

  const installed = Boolean(data.extensionInstalled);
  $('setup-badge').textContent = installed ? 'Installed' : data.extensionStatus === 'outdated' ? 'Update needed' : data.extensionStatus === 'custom' ? 'Custom' : 'Not installed';
  $('setup-badge').classList.toggle('on', installed);
  $('setup-description').textContent = installed ? 'Extension up to date. Start or restart OMP to send your current project, chat title, model, and effort.' : data.extensionStatus === 'outdated' ? 'Update the extension to show the current project and chat title. Restart OMP afterward.' : data.extensionStatus === 'custom' ? 'This extension was edited. Copy the new version manually if you want project and chat details.' : 'Install the included extension to share your project, optional chat title, model, and effort. Restart OMP afterward.';
  $('setup-details').hidden = installed;
  $('install-extension').disabled = installed || data.extensionStatus === 'custom';
  $('install-extension').textContent = data.extensionStatus === 'outdated' ? 'Update OMP extension' : data.extensionStatus === 'custom' ? 'Custom extension found' : 'Install OMP extension';
  $('setup-heading').textContent = 'OMP extension';

  $('avatar').src = data.avatar || '../assets/omp.png';
  $('avatar').alt = data.avatar ? 'Your local profile image' : 'OMP logo, default profile image';
  $('remove-avatar').disabled = !data.avatar;
  const theme = ['omp', 'black', 'white'].includes(data.settings.theme) ? data.settings.theme : 'omp';
  document.body.dataset.theme = theme;
  document.querySelectorAll('.theme-choice').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.choice === theme));
  });
}

$('home-nav').addEventListener('click', () => showView('home'));
$('settings-nav').addEventListener('click', () => showView('settings'));
$('back-home').addEventListener('click', () => showView('home'));
for (const key of fields) {
  $(key).addEventListener('input', () => {
    revisions[key]++;
    dirty.add(key);
    message('feedback', '');
  });
}
window.rpc.onSnapshot((data) => { receivedSnapshot = true; render(data); });
window.rpc.snapshot().then((data) => { if (!receivedSnapshot) render(data); }).catch((error) => message('connection-feedback', errorText(error), true));
setInterval(updateElapsed, 1000);

$('save').addEventListener('click', async () => {
  const button = $('save');
  const atSave = { ...revisions };
  button.disabled = true;
  try {
    const settings = {
      userName: $('userName').value,
      showTitle: $('showTitle').checked, showModel: $('showModel').checked, showEffort: $('showEffort').checked,
      showElapsed: $('showElapsed').checked, launchWithOmp: $('launchWithOmp').checked,
    };
    const result = await window.rpc.save(settings);
    for (const key of fields) if (revisions[key] === atSave[key]) dirty.delete(key);
    render(result);
    message('feedback', dirty.size ? 'Presence settings saved. You have unsaved edits.' : 'Presence settings saved. Discord will update shortly.');
  } catch (error) {
    message('feedback', errorText(error), true);
  } finally {
    button.disabled = false;
  }
});
$('pause').addEventListener('click', async () => {
  const button = $('pause');
  button.disabled = true;
  try { render(await window.rpc.pause()); message('connection-feedback', ''); }
  catch (error) { message('connection-feedback', errorText(error), true); }
  finally { button.disabled = false; }
});
$('reconnect').addEventListener('click', async () => {
  const button = $('reconnect');
  button.disabled = true;
  message('connection-feedback', 'Reconnecting to Discord…');
  try { render(await window.rpc.reconnect()); message('connection-feedback', ''); }
  catch (error) { message('connection-feedback', errorText(error), true); }
  finally { button.disabled = false; }
});
$('install-extension').addEventListener('click', async () => {
  const button = $('install-extension');
  button.disabled = true;
  try {
    render(await window.rpc.installExtension());
    message('install-feedback', 'Installed. Restart OMP to load it.');
  } catch (error) {
    message('install-feedback', errorText(error), true);
    button.disabled = false;
  }
});
$('pick-avatar').addEventListener('click', async () => {
  const button = $('pick-avatar');
  button.disabled = true;
  try {
    const previous = current?.avatar;
    const result = await window.rpc.pickAvatar();
    render(result);
    message('avatar-feedback', result.avatar !== previous ? 'Profile picture updated in this app.' : 'No image selected.');
  } catch (error) { message('avatar-feedback', errorText(error), true); }
  finally { button.disabled = false; }
});
$('remove-avatar').addEventListener('click', async () => {
  const button = $('remove-avatar');
  button.disabled = true;
  try { render(await window.rpc.removeAvatar()); message('avatar-feedback', 'Profile picture removed.'); }
  catch (error) { message('avatar-feedback', errorText(error), true); button.disabled = false; }
});
$('github').addEventListener('click', () => window.rpc.openGithub());
document.querySelectorAll('.theme-choice').forEach((button) => {
  button.addEventListener('click', async () => {
    const buttons = document.querySelectorAll('.theme-choice');
    buttons.forEach((choice) => { choice.disabled = true; });
    try { render(await window.rpc.setTheme(button.dataset.choice)); message('theme-feedback', 'Theme saved automatically.'); }
    catch (error) { message('theme-feedback', errorText(error), true); }
    finally { buttons.forEach((choice) => { choice.disabled = false; }); }
  });
});
