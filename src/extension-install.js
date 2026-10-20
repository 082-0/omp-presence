'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const previousVersions = new Set([
  '073cc725f3264d275a19e23abe6083dd3b8560e56009ef867260198bbf96acf4',
  '6bbc3964031e42845dc0a7f68c73888f185c2d68bcdbb4f51d7f5477e6457a50',
]);
function extensionStatus(source, target, knownVersions = previousVersions) {
  try {
    if (fs.lstatSync(target).isSymbolicLink()) return 'custom';
    const installed = fs.readFileSync(target);
    if (installed.equals(fs.readFileSync(source))) return 'current';
    return knownVersions.has(createHash('sha256').update(installed).digest('hex')) ? 'outdated' : 'custom';
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing';
    throw error;
  }
}
function installExtension(source, target, knownVersions = previousVersions) {
  const status = extensionStatus(source, target, knownVersions);
  if (status === 'current') return;
  if (status === 'custom') throw new Error('This extension was changed. Copy the new version manually to keep your edits.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target, status === 'missing' ? fs.constants.COPYFILE_EXCL : 0);
}
module.exports = { extensionStatus, installExtension };
