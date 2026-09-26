import { companionCore } from '@/components/operator/companionCore';
import { companionWorker } from '@/components/operator/companionWorker';
import { companionMcp } from '@/components/operator/companionMcp';
import { downloadFile } from '@/components/operator/zipReader';
const requirements='PyAutoGUI==0.9.54\nPillow>=10.4,<13\n';
const windows=String.raw`@echo off
cd /d "%~dp0"
echo This enables desktop input for connected agents. Close sensitive apps first.
choice /m "Allow mouse and keyboard control"
if errorlevel 2 exit /b
py -3 -m venv .venv
if errorlevel 1 goto error
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto error
.venv\Scripts\python.exe operator_companion.py --print-mcp-config --allow-input > mcp-config.json
if exist operator-device.json (.venv\Scripts\python.exe operator_companion.py --worker --allow-input) else (echo Local MCP kit ready. Import mcp-config.json into your MCP client.)
pause
exit /b
:error
echo Setup failed. Install Python 3.11 or newer and try again.
pause
`;
const unix=String.raw`#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "This enables desktop input for connected agents. Close sensitive apps first."
read -r -p "Allow mouse and keyboard control? Type YES: " answer
[ "$answer" = "YES" ] || exit 0
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python operator_companion.py --print-mcp-config --allow-input > mcp-config.json
if [ -f operator-device.json ]; then
  .venv/bin/python operator_companion.py --worker --allow-input
else
  echo "Local MCP kit ready. Import mcp-config.json into your MCP client."
fi
`;
const readme=`XTREME AI OPERATOR — DESKTOP COMPANION\n\nRequirements: Python 3.11+, an unlocked desktop, and explicit permission to control it.\n\n1. Extract this ZIP to a private folder (not a shared or synced public folder).\n2. Windows: double-click start-windows.cmd. macOS/Linux: run bash start-macos-linux.sh from that folder.\n3. Approve input control only if you trust the AI clients you connect. The setup installs PyAutoGUI and Pillow into an isolated .venv.\n4. A paired kit starts the background polling worker. Keep its terminal open. It reconnects after network failures; the computer must remain awake and signed in. It does not auto-start after reboot.\n5. For local AI clients, setup writes mcp-config.json with absolute paths. Add that entry to a client supporting local stdio MCP (e.g. Claude Desktop or Cursor), then restart that client. ChatGPT web cannot run a local stdio process: use the published app's remote MCP tools instead.\n\nSTOP: Ctrl+C in the worker terminal, pause/revoke the device in the web app, or move the pointer into a corner of the primary screen to trigger the PyAutoGUI fail-safe. Local MCP runs as a separate process managed by the AI client: disconnect that MCP server to stop its local access. Pausing the web device only pauses the remote queue. Commands already executing cannot be undone.\n\nmacOS: grant Accessibility and Screen Recording to the terminal/Python process in System Settings.\nLinux: use X11 (Wayland is not supported by PyAutoGUI); your distro may need python3-tk, python3-dev, and scrot.\nWindows: UAC secure screens cannot be controlled. Desktop input supports ASCII and the primary monitor only.\n\nSCREENSHOTS: provided directly to a local MCP client, never uploaded to public storage and never saved in app records. Remote cloud MCP provides action receipts and screen dimensions, not screenshots.\n\nCLOUD BROWSER: the supplied cloud-browser14.zip contains the separate Playwright engine. Deploy it yourself, or run it locally. Optional engine URL/key in your private pairing download are loaded only on this computer. Alternatively set OPERATOR_BROWSER_URL and OPERATOR_BROWSER_KEY in your local environment. Localhost HTTP is supported; other addresses must use HTTPS. The browser adapter implements the archive's /sessions and /sessions/:id/execute interfaces. It does not import that entire application.\n\nAI GOALS AND CRON: this companion executes explicit actions, not natural-language reasoning. Your connected AI client reads app tasks, plans actions, calls tools, verifies results, and updates task status. Existing cloud schedules enqueue goals and still require Base44 automation credits. It does not install X1 AI Hub's agents automatically.\n\nSECURITY: operator-device.json contains a device credential valid for 30 days, and may contain your browser-engine key. Keep it private; use OS file permissions. Do not share this kit after pairing. Revoke the device if it is lost. Remote action inputs and receipts are stored in your app; do not send passwords through that queue. Local MCP grants your AI client the same desktop powers you approve. No shell command tool is provided.\n\nThe app must be published and the paired kit must contain the correct published app address. A browser tab by itself cannot install or run this companion.\n`;
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(0xedb88320&-(crc&1));}return (crc^0xffffffff)>>>0;}
function storedZip(files){
  const enc=new TextEncoder(),parts=[],central=[];let offset=0;
  for(const [path,text] of Object.entries(files)){const name=enc.encode(path),data=enc.encode(text),crc=crc32(data);const header=new Uint8Array(30+name.length),view=new DataView(header.buffer);view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);const dir=new Uint8Array(46+name.length),dv=new DataView(dir.buffer);dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x800,true);dv.setUint32(16,crc,true);dv.setUint32(20,data.length,true);dv.setUint32(24,data.length,true);dv.setUint16(28,name.length,true);dv.setUint32(42,offset,true);dir.set(name,46);parts.push(header,data);central.push(dir);offset+=header.length+data.length;}
  const size=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,central.length,true);ev.setUint16(10,central.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);const result=new Uint8Array(offset+size+22);let position=0;for(const part of [...parts,...central,end]){result.set(part,position);position+=part.length;}return result;
}
export default function downloadCompanion(config){const files={'operator_companion.py':companionCore+companionWorker+companionMcp,'requirements.txt':requirements,'start-windows.cmd':windows.replace(/\r?\n/g,'\r\n'),'start-macos-linux.sh':unix,'README.txt':readme};if(config)files['operator-device.json']=JSON.stringify(config,null,2);downloadFile(storedZip(files),config?'operator-paired-companion.zip':'operator-local-mcp.zip');}