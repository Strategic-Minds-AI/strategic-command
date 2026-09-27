import React, { useEffect, useState } from 'react';
import { Menu, MessageSquare, Moon, Sun, ShieldCheck } from 'lucide-react';
import OperatorNavigation, { navigation } from '@/components/operator/OperatorNavigation';
import CopilotDrawer from '@/components/operator/CopilotDrawer';
export default function OperatorShell({ view, onNavigate, user, children }) {
  const [menuOpen,setMenuOpen]=useState(false), [chatOpen,setChatOpen]=useState(false);
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('operator-theme')==='light'?'light':'dark';}catch{return 'dark';}});
  useEffect(()=>{document.documentElement.classList.toggle('dark',theme==='dark');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111114':'#FFFFFF');try{localStorage.setItem('operator-theme',theme);}catch{}},[theme]);
  useEffect(()=>{const onKey=e=>{if(e.key==='Escape')setMenuOpen(false);};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[]);
  return <div className="min-h-screen bg-background text-foreground">
    {menuOpen&&<div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={()=>setMenuOpen(false)} aria-hidden="true"/>}
    <div data-open={menuOpen} className={`operator-menu-shell fixed inset-y-0 left-0 z-50 w-64 md:w-56 md:translate-x-0 transition-transform duration-200 ${menuOpen?'translate-x-0':'-translate-x-full'}`}><OperatorNavigation view={view} onNavigate={onNavigate} user={user} onClose={()=>setMenuOpen(false)}/></div>
    <div className={`min-w-0 md:ml-56 transition-[margin] duration-200 ${chatOpen?'xl:mr-[390px]':''}`}>
      <header className="sticky top-0 z-20 h-16 border-b border-border bg-background flex items-center justify-between gap-3 px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3"><button type="button" className="md:hidden rounded-lg p-2 hover:bg-accent" aria-label="Open tool menu" aria-controls="operator-navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu className="h-5 w-5"/></button><span className="truncate text-sm font-semibold">{navigation.find(n=>n[0]===view)?.[1]||'Overview'}</span></div>
        <div className="flex items-center gap-2"><span className="hidden sm:inline-flex neutral-pill"><ShieldCheck className="h-3 w-3"/>Admin access</span><button type="button" className="rounded-lg p-2 hover:bg-accent" aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun className="h-5 w-5"/>:<Moon className="h-5 w-5"/>}</button><button type="button" className="brand-outline !py-2 !px-3" aria-label={chatOpen?'Close copilot':'Open copilot'} aria-expanded={chatOpen} onClick={()=>setChatOpen(!chatOpen)}><MessageSquare className="h-4 w-4"/><span className="hidden sm:inline">Copilot</span></button></div>
      </header>
      <main className="max-w-[1536px] mx-auto p-4 sm:p-7 lg:p-9">{children}</main>
      <footer className="px-4 sm:px-7 py-6 border-t border-border text-xs text-muted-foreground">Xtreme Agent Command · Secure pairing · Desktop companion</footer>
    </div>
    <CopilotDrawer open={chatOpen} onClose={()=>setChatOpen(false)} userId={user?.id}/>
  </div>;
}