import {createClientFromRequest} from 'npm:@base44/sdk@0.8.49';
import {hashToken,validateAction,actionCapability} from '../../shared/operatorActions.ts';
export default async function(req){
  try{
    if(req.method!=='POST')return Response.json({error:'POST required'},{status:405});
    const text=await req.text();if(text.length>12000)return Response.json({error:'Request too large'},{status:413});
    const body=JSON.parse(text),token=req.headers.get('x-operator-token')||'';
    if(!/^[a-f0-9]{64}$/.test(token)||typeof body.device_id!=='string'||body.device_id.length>100)return Response.json({error:'Invalid device credentials'},{status:401});
    const api=createClientFromRequest(req),store=api.asServiceRole.entities;
    const devices=await store.OperatorDevice.filter({id:body.device_id},'-created_date',1),device=devices[0];
    if(!device||device.revoked||Date.parse(device.expires_at)<Date.now()||device.token_hash!==await hashToken(token))return Response.json({error:'Pairing expired or revoked'},{status:401});
    const now=new Date().toISOString();
    if(body.operation==='poll'){
      await store.OperatorDevice.update(device.id,{last_seen:now,platform:String(body.platform||'Unknown').slice(0,80),input_allowed:body.input_allowed===true,browser_configured:body.browser_configured===true});
      if(!device.enabled)return Response.json({paused:true,command:null});
      const inflight=await store.ComputerCommand.filter({device_id:device.id,status:'running',expires_at:{$gt:now}},'created_date',1);
      if(inflight.length)return Response.json({paused:false,command:null});
      const rows=await store.ComputerCommand.filter({device_id:device.id,created_by_id:device.created_by_id,status:'queued'},'created_date',20);
      for(const row of rows){
        if(Date.parse(row.expires_at)<=Date.now()){await store.ComputerCommand.update(row.id,{status:'cancelled',result:'Expired before dispatch.'});continue;}
        let args;try{args=validateAction(row.action,row.arguments);}catch(e){await store.ComputerCommand.update(row.id,{status:'failed',result:e.message});continue;}
        if(!actionCapability(row.action,{input_allowed:body.input_allowed===true,browser_configured:body.browser_configured===true})){await store.ComputerCommand.update(row.id,{status:'failed',result:'Capability disabled on companion.'});continue;}
        const lease=crypto.randomUUID();await store.ComputerCommand.updateMany({id:row.id,status:'queued'},{$set:{status:'running',lease,started_at:now}});
        const claimed=await store.ComputerCommand.get(row.id);if(claimed.lease!==lease)continue;
        return Response.json({paused:false,command:{id:row.id,action:row.action,arguments:args,lease,expires_at:row.expires_at}});
      }
      return Response.json({paused:false,command:null});
    }
    if(!['authorize','complete'].includes(body.operation))return Response.json({error:'Unknown operation'},{status:400});
    const command=await store.ComputerCommand.get(String(body.command_id||''));
    if(!command||command.device_id!==device.id||command.created_by_id!==device.created_by_id||command.lease!==body.lease)return Response.json({error:'Command not assigned to this companion'},{status:403});
    if(body.operation==='authorize')return Response.json({allowed:device.enabled===true&&command.status==='running'&&Date.parse(command.expires_at)>Date.now()});
    if(['succeeded','failed','cancelled','uncertain'].includes(command.status))return Response.json({ok:true,status:command.status});
    const result=String(body.result||'').slice(0,5000),status=body.uncertain===true?'uncertain':body.success===true?'succeeded':'failed';
    await store.ComputerCommand.update(command.id,{status,result,finished_at:now});return Response.json({ok:true,status});
  }catch(e){return Response.json({error:e.message},{status:500});}
}