'use strict';
const { execFile } = require('node:child_process');

function detectOmp(run = execFile) {
  return new Promise((resolve) => {
    const script = 'Get-CimInstance Win32_Process -Filter "Name = \'omp.exe\'" | Where-Object { $_.CommandLine -notmatch "__omp_worker" } | Select-Object -ExpandProperty ProcessId';
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 7000, maxBuffer: 64 * 1024 }, (error, stdout) => {
        resolve(!error && Boolean(stdout?.trim()));
      });
  });
}

module.exports = { detectOmp };
