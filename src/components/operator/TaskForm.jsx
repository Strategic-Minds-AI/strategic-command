import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import BrandButton from '@/components/operator/BrandButton';
import { cadenceLabels } from '@/components/operator/sourcePackages';
export default function TaskForm({ open, onClose, onSaved, schedule = false }) {
  const [title, setTitle] = useState(''), [instructions, setInstructions] = useState(''), [target, setTarget] = useState('cloud_browser'), [cron, setCron] = useState('0 * * * *');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const value = { title: title.trim(), instructions: instructions.trim(), target };
      if (!value.title || !value.instructions) throw new Error('Add a task name and instructions.');
      if (schedule) await base44.entities.OperatorSchedule.create({ ...value, cron, enabled: false });
      else await base44.entities.OperatorTask.create({ ...value, status: 'queued', source: 'manual' });
      await onSaved(); onClose(); setTitle(''); setInstructions('');
    } catch (e) { setError(e.message || 'Could not save. Please try again.'); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => !value && !busy && onClose()}><DialogContent className="max-w-lg rounded-2xl p-7"><DialogHeader><DialogTitle className="text-2xl">{schedule ? 'Create a schedule' : 'Create a task'}</DialogTitle><DialogDescription>{schedule ? 'Save a recurring task. New schedules start paused.' : 'Capture the goal. Tasks stay queued until an execution connection is added.'}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="grid gap-5 mt-3">
      <label className="field-label">Task name<input className="operator-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Review my daily reports" required /></label>
      <label className="field-label">Instructions<textarea className="operator-input min-h-28 resize-y" value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={5000} placeholder="Describe the goal, scope, and when the agent should stop…" required /></label>
      <label className="field-label">Run environment<select className="operator-input" value={target} onChange={e => setTarget(e.target.value)}><option value="cloud_browser">Cloud browser · not connected</option><option value="computer">My computer · not connected</option></select></label>
      {schedule && <label className="field-label">Frequency<select className="operator-input" value={cron} onChange={e => setCron(e.target.value)}>{Object.entries(cadenceLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><span className="font-mono text-xs text-muted-foreground">{cron} · UTC</span></label>}
      <p className="text-xs text-muted-foreground">{schedule ? 'Automatic scheduling requires available integration credits. A schedule adds tasks to the queue; it does not control a computer by itself.' : 'No action will run on your computer. A local companion and explicit device permissions are still required.'}</p>
      {error && <p role="alert" className="text-sm border border-black/20 rounded-lg p-3">{error}</p>}
      <BrandButton type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="animate-spin" /> : null}{busy ? 'Saving…' : schedule ? 'Save paused schedule' : 'Add to task queue'}<ArrowRight /></BrandButton>
    </form></DialogContent></Dialog>;
}