const MAX_FILE = 4 * 1024 * 1024;
const decoder = new TextDecoder();
export function readZip(buffer) {
  if (buffer.byteLength > 20 * 1024 * 1024) throw new Error('Choose a ZIP smaller than 20 MB.');
  const view = new DataView(buffer); let end = buffer.byteLength - 22;
  while (end >= Math.max(0, buffer.byteLength - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0 || end < Math.max(0, buffer.byteLength - 65557)) throw new Error('This file is not a supported ZIP archive.');
  const count = view.getUint16(end + 10, true); let cursor = view.getUint32(end + 16, true);
  if (count > 2000 || view.getUint16(end + 4, true) || cursor === 0xffffffff) throw new Error('Split, ZIP64, or archives with more than 2,000 entries are not supported.');
  const files = [];
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > buffer.byteLength || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('The ZIP directory is damaged.');
    const nameLength = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
    const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    const mode = view.getUint32(cursor + 38, true) >>> 16;
    const safe = name && !name.startsWith('/') && !name.includes('\\') && !name.includes('\0') && !name.includes(':') && !name.split('/').some(part => part === '..' || part === '.') && (mode & 0xf000) !== 0xa000;
    if (safe && !name.endsWith('/')) files.push({name, method: view.getUint16(cursor + 10, true), flags: view.getUint16(cursor + 8, true), size: view.getUint32(cursor + 24, true), compressed: view.getUint32(cursor + 20, true), offset: view.getUint32(cursor + 42, true), crc: view.getUint32(cursor + 16, true)});
    cursor += 46 + nameLength + extra + comment;
  }
  return { buffer, files: files.sort((a,b) => a.name.localeCompare(b.name)) };
}
export async function extractFile(archive, file) {
  if (file.size > MAX_FILE || file.compressed > MAX_FILE) throw new Error('Individual files are limited to 4 MB.');
  if (file.flags & 1) throw new Error('Password-protected ZIPs are not supported.');
  const view = new DataView(archive.buffer), at = file.offset;
  if (at + 30 > archive.buffer.byteLength || view.getUint32(at, true) !== 0x04034b50) throw new Error('Invalid ZIP file header.');
  const start = at + 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true);
  if (start + file.compressed > archive.buffer.byteLength) throw new Error('The ZIP is incomplete.');
  const input = archive.buffer.slice(start, start + file.compressed); let bytes;
  if (file.method === 0) bytes = new Uint8Array(input);
  else if (file.method === 8) {
    if (!globalThis.DecompressionStream) throw new Error('Use a current Chrome, Edge, Firefox, or Safari version to extract files.');
    const reader = new Blob([input]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = []; let length = 0;
    while (true) { const {done, value} = await reader.read(); if (done) break; length += value.length; if (length > MAX_FILE) { await reader.cancel(); throw new Error('Extracted file exceeds the 4 MB limit.'); } chunks.push(value); }
    bytes = new Uint8Array(length); let position = 0; for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
  } else throw new Error('This compression method is not supported.');
  if (bytes.length !== file.size) throw new Error('ZIP file size verification failed.');
  let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  if (((crc ^ 0xffffffff) >>> 0) !== file.crc) throw new Error('ZIP checksum verification failed.');
  return bytes;
}
export function downloadFile(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], {type:'application/octet-stream'}));
  const link = document.createElement('a'); link.href = url; link.download = name.split('/').pop(); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function extractToFolder(archive, directory) {
  if (archive.files.reduce((sum, f) => sum + f.size, 0) > 50 * 1024 * 1024) throw new Error('Folder extraction is limited to 50 MB total.');
  // A new subfolder avoids silently overwriting existing local files.
  const root = await directory.getDirectoryHandle('operator-extracted-' + Date.now(), {create:true});
  for (const file of archive.files) { let dir = root; const parts = file.name.split('/').filter(Boolean); const name = parts.pop(); const bytes = await extractFile(archive, file); for (const part of parts) dir = await dir.getDirectoryHandle(part, {create:true}); const handle = await dir.getFileHandle(name, {create:true}); const writer = await handle.createWritable(); await writer.write(bytes); await writer.close(); }
  return archive.files.length;
}