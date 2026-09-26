import React from 'react';
import { Globe, Cpu, ArrowRight, Check } from 'lucide-react';
import BrandButton from '@/components/operator/BrandButton';
import { sourcePackages } from '@/components/operator/sourcePackages';
export default function SourcePackageCards({ onInspect, busy }) {
  return <div className="grid md:grid-cols-2 gap-5">{sourcePackages.map((source,index)=><article className="brand-board" key={source.id}><div className="flex items-start justify-between gap-3"><div className="brand-board-icon">{index===0?<Globe className="w-5 h-5"/>:<Cpu className="w-5 h-5"/>}</div><span className="neutral-pill"><Check className="w-3 h-3"/>Inspected</span></div><h3>{source.name}</h3><p>{source.description}</p><div className="flex items-center justify-between gap-3 mt-6"><span className="text-xs text-muted-foreground">{source.files} entries · {source.size}</span><BrandButton variant="outline" disabled={busy} onClick={()=>onInspect(source)}>Explore ZIP<ArrowRight/></BrandButton></div></article>)}</div>;
}