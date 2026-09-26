import React, { useEffect, useRef } from 'react';
import { Upload, ShieldCheck } from 'lucide-react';
import BrandButton from '@/components/operator/BrandButton';
import SourcePackageCards from '@/components/operator/SourcePackageCards';
import ArchiveFiles from '@/components/operator/ArchiveFiles';
import useZipArchive from '@/components/operator/useZipArchive';
import { sourcePackages } from '@/components/operator/sourcePackages';
export default function SourceExplorer({ initialPackage }) {
  const zip=useZipArchive(), input=useRef(null), initialized=useRef(false);
  useEffect(()=>{if(initialPackage&&!initialized.current){initialized.current=true;const source=sourcePackages.find(p=>p.id===initialPackage);if(source)zip.inspect(source);}},[initialPackage]);
  return <div className="space-y-6"><SourcePackageCards onInspect={zip.inspect} busy={zip.busy}/><div className="flex flex-wrap justify-between items-center gap-4"><div><h2 className="font-bold text-lg">Archive explorer</h2><p className="text-sm text-muted-foreground mt-1">Read source, download a file, or extract to a local folder.</p></div><BrandButton variant="outline" disabled={zip.busy} onClick={()=>input.current.click()}><Upload/>Open local ZIP</BrandButton><input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={e=>{if(e.target.files?.[0])zip.inspect(e.target.files[0]);e.target.value='';}}/></div>
    {zip.error&&<p role="alert" className="border border-black/20 p-4 rounded-xl text-sm">{zip.error}</p>}{zip.notice&&<p role="status" className="border p-4 rounded-xl text-sm">{zip.notice}</p>}<ArchiveFiles zip={zip}/><div className="flex gap-2 items-start text-xs text-muted-foreground"><ShieldCheck className="w-4 h-4 shrink-0"/><p>Files are never run automatically. Limits: 20 MB ZIP, 2,000 entries, 4 MB per extracted file. Folder extraction needs a supported desktop browser and your permission.</p></div></div>;
}