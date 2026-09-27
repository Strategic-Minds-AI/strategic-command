import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Image } from '@/components/ui/image';
import AgentToolResult from '@/components/whatsapp/AgentToolResult';
export default function OperatorMessage({ message }) {
  const user=message.role==='user';
  return <article className={`max-w-[92%] rounded-xl border p-4 text-sm break-words ${user?'ml-auto bg-muted':'mr-auto bg-card'}`}><p className="text-xs font-semibold mb-2">{user?'You':'Operator'}</p>{message.content&&(user?<p className="whitespace-pre-wrap">{message.content}</p>:<ReactMarkdown components={{a:({children,...props})=><a {...props} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>,img:({src,alt})=><Image src={src} alt={alt||'Agent image'} className="w-full h-64" fittingType="fit"/>,p:({children})=><p className="whitespace-pre-wrap mb-2 last:mb-0">{children}</p>}}>{message.content}</ReactMarkdown>)}{message.tool_calls?.map((tool,index)=><AgentToolResult key={tool.id||index} tool={tool}/>)}</article>;
}