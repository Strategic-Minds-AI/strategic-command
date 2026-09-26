import {createClientFromRequest} from 'npm:@base44/sdk@0.8.49';
import {hashToken,publicDevice} from '../../shared/operatorActions.ts';
export default async function(req){
  try{
    const api=createClientFromRequest(req),user=await api.auth.me();
    if(!user||user.role!=='admin')return Response.json({error:'Administrator access required'},{status:403});
    const body=await req.json(),op=body.operation;
    if(op==='list'){const records=await api.entities.OperatorDevice.filter({created_by_id:user.id},'-created_date',50);return Response.json({devices:records.map(publicDevice)});}
    if(op==='create'){
      const name=String(body.name||'').trim();if(!name||name.length>80)return Response.json({error:'Enter a device name up to 80 characters.'},{status:400});
      const existing=await api.entities.OperatorDevice.filter({created_by_id:user.id,revoked:false},'-created_date',10);if(existing.length>=10)return Response.json({error:'Revoke an unused device before pairing another (10-device limit).'},{status:400});
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');
      const device=await api.entities.OperatorDevice.create({name,token_hash:await hashToken(token),expires_at:new Date(Date.now()+30*86400000).toISOString(),enabled:true,revoked:false});
      return Response.json({device:publicDevice(device),token});
    }
    if(!['pause','resume','revoke'].includes(op))return Response.json({error:'Unknown operation'},{status:400});
    const device=await api.entities.OperatorDevice.get(String(body.device_id||''));
    if(!device||device.created_by_id!==user.id)return Response.json({error:'Device not found'},{status:404});
    if(device.revoked)return Response.json({error:'This pairing is revoked. Create a new pairing.'},{status:409});
    const updated=await api.entities.OperatorDevice.update(device.id,op==='revoke'?{enabled:false,revoked:true,token_hash:''}:{enabled:op==='resume'});
    if(op!=='resume')await api.entities.ComputerCommand.updateMany({device_id:device.id,status:'queued'},{$set:{status:'cancelled',result:'Stopped by device owner.',finished_at:new Date().toISOString()}});
    return Response.json({device:publicDevice(updated)});
  }catch(e){return Response.json({error:e.message},{status:500});}
}