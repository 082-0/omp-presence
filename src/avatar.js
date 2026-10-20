'use strict';
const fs = require('node:fs');

function readAvatar(file) {
  try { return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`; }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}

function saveAvatar(source, destination, nativeImage) {
  if (fs.statSync(source).size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  const image = nativeImage.createFromPath(source);
  if (image.isEmpty()) throw new Error('Could not open that image. Choose a PNG or JPEG.');
  const { width, height } = image.getSize();
  const side = Math.min(width, height);
  const png = image.crop({ x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), width: side, height: side }).resize({ width: 128, height: 128 }).toPNG();
  fs.writeFileSync(destination, png);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function removeAvatar(file) { fs.rmSync(file, { force: true }); }

module.exports = { readAvatar, saveAvatar, removeAvatar };
