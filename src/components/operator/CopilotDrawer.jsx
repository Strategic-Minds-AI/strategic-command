import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import OperatorChat from '@/components/whatsapp/OperatorChat';
export default function CopilotDrawer({ open, onClose, userId }) {
  const closeRef=useRef(null);
  useEffect(()=>{if(!open)return;const onKey=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',onKey);closeRef.current?.focus();return()=>document.removeEventListener('keydown',onKey);},[open,onClose]);
  return <><div className={`fixed inset-0 z-30 bg-black/60 xl:hidden ${open?'block':'hidden'}`} onClick={onClose} aria-hidden="true"/>
    <aside aria-label="Operator copilot" aria-hidden={!open} className={`copilot-drawer fixed right-0 top-0 bottom-0 z-40 w-full max-w-[430px] xl:w-[390px] border-l border-border bg-card shadow-2xl flex flex-col transition-transform duration-200 ${open?'translate-x-0':'translate-x-full pointer-events-none'}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-bold text-base">Operator copilot</h2><p className="text-xs text-muted-foreground">Private conversation with your operator</p></div><button ref={closeRef} type="button" className="rounded-lg p-2 hover:bg-accent" onClick={onClose} aria-label="Close copilot"><X className="h-5 w-5"/></button></div>
      {open&&<OperatorChat userId={userId} compact/>}
    </aside></>;
}