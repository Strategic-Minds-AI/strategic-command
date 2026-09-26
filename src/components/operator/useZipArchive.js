import { useState, useRef } from 'react';
import { readZip, extractFile, downloadFile, extractToFolder } from '@/components/operator/zipReader';
export default function useZipArchive() {
  const [archive,setArchive] = useState(null), [name,setName] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [selected,setSelected] = useState(null), [preview,setPreview] = useState(''), [fileBusy,setFileBusy] = useState(false);
  const sequence = useRef(0);
  async function inspect(source) {
    if (busy) return;
    sequence.current++; setBusy(true); setError(''); setNotice(''); setSelected(null); setPreview(''); setArchive(null); setName(source.filename || source.name);
    try { let buffer; if (source instanceof File) buffer = await source.arrayBuffer(); else {const response = await fetch(source.url); if (!response.ok) throw new Error('Could not download the archive. Try again or open a local ZIP.'); buffer = await response.arrayBuffer();} setArchive(readZip(buffer)); }
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function open(file) {
    const token = ++sequence.current; setSelected(file); setPreview(''); setFileBusy(true); setError('');
    try { const bytes = await extractFile(archive,file); if (token !== sequence.current) return; setPreview(bytes.subarray(0,1000).includes(0) ? 'Binary file. Use Download file to extract it.' : new TextDecoder().decode(bytes.subarray(0,120000)) + (bytes.length>120000?'\n\n[Preview limited to 120 KB. Download the complete file.]':'')); }
    catch(e) {if(token===sequence.current)setError(e.message);} finally {if(token===sequence.current)setFileBusy(false);}
  }
  async function download() {setError('');setFileBusy(true);try{downloadFile(await extractFile(archive,selected),selected.name);}catch(e){setError(e.message);}finally{setFileBusy(false);}}
  async function extractAll() {
    setError('');setNotice('');
    if (!window.showDirectoryPicker) {setError('Folder extraction requires Chrome or Edge on desktop. You can still inspect and download individual files here.');return;}
    try { const directory=await window.showDirectoryPicker({mode:'readwrite'});setBusy(true);const count=await extractToFolder(archive,directory);setNotice(`Extracted ${count} files into a new folder. No files were executed.`); }
    catch(e){if(e.name!=='AbortError')setError(`Extraction stopped: ${e.message} Any files already saved remain in the new extraction folder.`);}finally{setBusy(false);}
  }
  return {archive,name,busy,error,notice,selected,preview,fileBusy,inspect,open,download,extractAll};
}