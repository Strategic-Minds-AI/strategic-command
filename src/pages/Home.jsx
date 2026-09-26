import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Info, ShieldCheck } from 'lucide-react';
import OperatorShell from '@/components/operator/OperatorShell';
import BrandButton from '@/components/operator/BrandButton';
import Overview from '@/components/operator/Overview';
import TaskList from '@/components/operator/TaskList';
import ScheduleList from '@/components/operator/ScheduleList';
import SourceExplorer from '@/components/operator/SourceExplorer';
import SystemsPanel from '@/components/operator/SystemsPanel';
import McpPanel from '@/components/operator/McpPanel';
import TaskForm from '@/components/operator/TaskForm';
import useOperatorData from '@/components/operator/useOperatorData';
const pages={overview:['Mission control','Your agents, tools, and tasks. One place to take control.'],tasks:['Task queue','Define the goal. Keep every instruction in view.'],schedules:['Run on your schedule','Turn repeatable work into a consistent routine.'],systems:['Connected systems','Know what’s connected. Know what’s in your control.'],sources:['Your source. Unpacked.','Explore the two systems powering your next build.'],mcp:['Agent access, on your terms.','Connect compatible AI clients through Model Context Protocol.']};
export default function Home() {
  const [params,setParams]=useSearchParams(), [form,setForm]=useState(null), data=useOperatorData();
  const view=pages[params.get('view')]?params.get('view'):'overview';
  const navigate=(next)=>setParams(next==='overview'?{}:{view:next});
  const sources=(id)=>setParams({view:'sources',package:id});
  if(data.loading)return <div className="min-h-screen flex items-center justify-center gap-3 text-sm"><Loader2 className="h-5 w-5 animate-spin"/>Loading your workspace…</div>;
  if(!data.user||data.user.role!=='admin')return <div className="max-w-lg mx-auto p-8 mt-20 text-center"><ShieldCheck className="h-10 w-10 mx-auto mb-6"/><h1 className="text-2xl font-bold">Administrator access required</h1><p className="text-muted-foreground mt-4">{data.error?.message||'Computer operations are restricted to workspace administrators.'}</p></div>;
  return <OperatorShell view={view} onNavigate={navigate} user={data.user}>
    <div className="flex flex-wrap justify-between items-center gap-5 mb-7"><div><div className="flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"/><p className="text-[10px] font-semibold text-muted-foreground">XTREME AI OPERATOR</p></div><h1 className="text-3xl sm:text-[34px] font-bold">{pages[view][0]}</h1><p className="text-sm text-muted-foreground mt-2">{pages[view][1]}</p></div>{view==='schedules'?<BrandButton disabled={data.schedules.length>=50} onClick={()=>setForm('schedule')}><Plus/>New schedule</BrandButton>:['overview','tasks'].includes(view)?<BrandButton onClick={()=>setForm('task')}><Plus/>New task</BrandButton>:null}</div>
    {Date.now()<Date.parse('2026-10-12T00:00:00Z')&&<div className="border rounded-xl p-4 mb-7 flex flex-wrap items-center gap-3 text-xs bg-muted"><Info className="w-4 h-4 shrink-0"/><p className="flex-1 min-w-48"><strong>Automation credits unavailable.</strong><span className="text-muted-foreground"> As reported September 26: upgrade or wait for October 12. Task saving and ZIP extraction still work.</span></p><button className="brand-link !text-xs flex items-center gap-1" onClick={()=>navigate('schedules')}>View schedules<ArrowRight className="w-3 h-3"/></button></div>}
    {data.error&&<p role="alert" className="border border-black/30 rounded-xl p-4 mb-6 text-sm">{data.error.message}<button className="ml-3 underline" onClick={data.refresh}>Refresh</button></p>}
    {view==='overview'&&<Overview data={data} onNavigate={navigate} onCreate={()=>setForm('task')} onSources={sources}/>}
    {view==='tasks'&&<TaskList tasks={data.tasks} onCreate={()=>setForm('task')} onUpdate={data.updateTask.mutate} busy={data.updateTask.isPending}/>}
    {view==='schedules'&&<ScheduleList schedules={data.schedules} onCreate={()=>setForm('schedule')} onUpdate={data.updateSchedule.mutate} busy={data.updateSchedule.isPending}/>}
    {view==='systems'&&<SystemsPanel onSources={sources} data={data}/>}
    {view==='sources'&&<SourceExplorer key={params.get('package')||'all'} initialPackage={params.get('package')}/>}
    {view==='mcp'&&<McpPanel/>}
    <TaskForm key={form||'closed'} open={!!form} schedule={form==='schedule'} onClose={()=>setForm(null)} onSaved={data.refresh}/>
  </OperatorShell>;
}