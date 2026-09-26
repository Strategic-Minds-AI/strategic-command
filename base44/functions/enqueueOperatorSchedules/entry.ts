import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({error:'Administrator access required'}, {status:403});
    const schedules = await base44.entities.OperatorSchedule.filter({enabled:true}, 'created_date', 50);
    const now = new Date(), minute = now.getUTCMinutes(), hour = now.getUTCHours();
    const slot = new Date(Math.floor(now.getTime() / 300000) * 300000).toISOString();
    let enqueued = 0;
    for (const item of schedules) {
      const due = (item.cron === '*/15 * * * *' && minute % 15 < 5) || (item.cron === '0 * * * *' && minute < 5) || (item.cron === '0 9 * * *' && hour === 9 && minute < 5);
      if (!due) continue;
      const exists = await base44.entities.OperatorTask.filter({schedule_id:item.id, schedule_slot:slot}, '-created_date', 1);
      if (exists.length) continue;
      await base44.entities.OperatorTask.create({title:item.title, instructions:item.instructions, target:item.target, status:'queued', source:'schedule', schedule_id:item.id, schedule_slot:slot});
      await base44.entities.OperatorSchedule.update(item.id, {last_enqueued_at:now.toISOString()});
      enqueued++;
    }
    return Response.json({enqueued, checked:schedules.length, note:'Queue only. No computer or browser actions are executed.'});
  } catch (error) { return Response.json({error:error.message}, {status:500}); }
}