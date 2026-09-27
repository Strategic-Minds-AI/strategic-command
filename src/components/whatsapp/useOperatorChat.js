import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export const operatorAgent = 'whatsapp_operator';
export default function useOperatorChat(userId) {
  const client=useQueryClient(), [selected,setSelected]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const listKey=['operator-agent-chats',userId];
  const list=useQuery({queryKey:listKey,queryFn:()=>base44.agents.listConversations({agent_name:operatorAgent}),enabled:!!userId});
  const conversations=list.data||[], id=selected||conversations[0]?.id;
  const conversation=useQuery({queryKey:['operator-agent-chat',userId,id],queryFn:()=>base44.agents.getConversation(id),enabled:!!id});
  useEffect(()=>{if(!id)return;return base44.agents.subscribeToConversation(id,data=>client.setQueryData(['operator-agent-chat',userId,id],old=>({...old,...data})));},[id,userId,client]);
  async function create() {
    const chat=await base44.agents.createConversation({agent_name:operatorAgent,metadata:{name:'Operator chat',description:'Private administrator conversation'}});
    client.setQueryData(['operator-agent-chat',userId,chat.id],chat);setSelected(chat.id);await client.invalidateQueries({queryKey:listKey});return chat;
  }
  async function newChat(){setBusy(true);setError('');try{await create();}catch(e){setError(e.message||'Could not create a conversation.');}finally{setBusy(false);}}
  async function send(text){setBusy(true);setError('');try{const chat=id?await base44.agents.getConversation(id):await create();await base44.agents.addMessage(chat,{role:'user',content:text});await client.invalidateQueries({queryKey:['operator-agent-chat',userId,chat.id]});return true;}catch(e){setError(e.message||'Could not send your message. Check agent access and available integration credits.');return false;}finally{setBusy(false);}}
  return {conversations,id,select:setSelected,messages:conversation.data?.messages||[],loading:list.isPending||(!!id&&conversation.isPending),busy,error:error||list.error?.message||conversation.error?.message,newChat,send,refresh:()=>Promise.all([list.refetch(),...(id?[conversation.refetch()]:[])])};
}