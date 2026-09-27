import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
export default async function(req) {
  try {
    if (req.method !== 'POST') return Response.json({error:'POST required'}, {status:405});
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({error:'Administrator access required'}, {status:403});
    const body = await req.json();
    if (body && Object.keys(body).some(key => key !== 'source')) return Response.json({error:'Unexpected input'}, {status:400});
    const source = body?.source === 'scheduled' ? 'scheduled' : 'manual';
    const now = new Date(), iso = now.toISOString();
    const [devices, tasks, schedules, commands] = await Promise.all([
      base44.entities.OperatorDevice.list('-created_date', 50),
      base44.entities.OperatorTask.list('-created_date', 200),
      base44.entities.OperatorSchedule.list('-created_date', 50),
      base44.entities.ComputerCommand.list('-created_date', 100)
    ]);
    const findings = [];
    const add = (code, severity, message, recommendation) => findings.push({code,severity,message,recommendation});
    const active = devices.filter(d => !d.revoked && d.enabled && Date.parse(d.expires_at) > now.getTime());
    if (!devices.length) add('no_device','warning','No desktop companion is paired.','Pair a computer before expecting local automation.');
    for (const d of active) {
      if (!d.last_seen || now.getTime() - Date.parse(d.last_seen) > 120000) add('device_offline','warning',`${d.name} has not checked in recently.`, 'Check that the computer is awake, signed in, and its companion is running.');
      if (Date.parse(d.expires_at) - now.getTime() < 3 * 86400000) add('pairing_expiry','warning',`${d.name} pairing expires within three days.`, 'Create a new pairing before this one expires.');
    }
    if (tasks.some(t => t.status === 'running' && now.getTime() - Date.parse(t.updated_date || t.created_date) > 3600000)) add('stale_tasks','warning','A running task has not changed for over an hour.','Review its receipt before retrying; it may still be executing.');
    if (commands.some(c => c.status === 'running' && Date.parse(c.expires_at) < now.getTime())) add('uncertain_commands','warning','An expired computer command is marked running.','Check the companion receipt before repeating this action.');
    if (schedules.some(s => s.enabled) && !active.length) add('schedule_without_device','warning','Schedules are enabled without an active paired computer.','Pair a computer or pause schedules that need one.');
    let healed = 0;
    for (const c of commands.filter(c => c.status === 'queued' && Date.parse(c.expires_at) <= now.getTime()).slice(0,20)) {
      const result = await base44.entities.ComputerCommand.updateMany({id:c.id,status:'queued'}, {$set:{status:'cancelled',result:'Expired before dispatch; closed by audit.',finished_at:iso}});
      if (result) healed++;
    }
    if (healed) add('expired_queue','info',`${healed} expired queued command(s) were closed.`, 'No desktop action was dispatched by this audit.');
    const record = await base44.entities.OperatorAudit.create({status:findings.some(f => f.severity === 'warning') ? 'attention' : 'healthy',summary:findings.length ? `${findings.length} finding(s) across recent operator activity.` : 'No issues detected in the recent operator activity checked.',findings:findings.slice(0,40),healed_count:healed,source});
    return Response.json({audit:record});
  } catch (error) { return Response.json({error:error.message}, {status:500}); }
}