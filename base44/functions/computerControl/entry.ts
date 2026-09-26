import {createClientFromRequest} from 'npm:@base44/sdk@0.8.49';
import {validateAction,actionCapability,publicDevice} from '../../shared/operatorActions.ts';
export default async function(req){
  try{
    const api=createClientFromRequest(req),user=await api.auth.me();if(!user||user.role!=='admin')return Response.json({error:'Administrator access required'},{status:403});
    const body=await req.json();
    if(body.operation==='devices'){const ds=await api.entities.OperatorDevice.filter({created_by_id:user.id},'-created_date',50);return Response.json({devices:ds.map(publicDevice)});}
    if(body.operation==='status'){
      const row=await api.entities.ComputerCommand.get(String(body.command_id||''));if(!row||row.created_by_id!==user.id)return Response.json({error:'Command not found'},{status:404});
      if(['queued','running'].includes(row.status)&&Date.parse(row.expires_at)<Date.now()){row.status=row.status==='running'?'uncertain':'cancelled';row.result=row.status==='uncertain'?'No completion receipt. The action may have run; inspect before repeating.':'Expired before dispatch.';await api.entities.ComputerCommand.update(row.id,{status:row.status,result:row.result});}
      return Response.json({id:row.id,device_id:row.device_id,action:row.action,status:row.status,result:row.result||'',created_date:row.created_date,finished_at:row.finished_at});
    }
    if(body.operation!=='send')return Response.json({error:'Use devices, send, or status.'},{status:400});
    let args;try{args=validateAction(body.action,body.arguments);}catch(e){return Response.json({error:e.message},{status:400});}
    const device=await api.entities.OperatorDevice.get(String(body.device_id||''));if(!device||device.created_by_id!==user.id)return Response.json({error:'Device not found'},{status:404});
    if(!publicDevice(device).online||!device.enabled)return Response.json({error:'Start the companion and resume the device before sending actions.'},{status:409});
    if(!actionCapability(body.action,device))return Response.json({error:'This capability is not enabled in the local companion.'},{status:403});
    const pending=await api.entities.ComputerCommand.filter({device_id:device.id,status:{$in:['queued','running']},expires_at:{$gt:new Date().toISOString()}},'-created_date',20);
    if(pending.length>=20)return Response.json({error:'Wait for queued actions to finish (20-action limit).'},{status:429});
    const row=await api.entities.ComputerCommand.create({device_id:device.id,action:body.action,arguments:args,status:'queued',expires_at:new Date(Date.now()+120000).toISOString()});
    return Response.json({command_id:row.id,status:'queued',note:'Queued is not executed. Poll status for a completion receipt.'});
  }catch(e){return Response.json({error:e.message},{status:500});}
}