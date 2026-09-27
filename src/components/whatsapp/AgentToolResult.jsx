import React from 'react';
function decoded(value) { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } }
export default function AgentToolResult({ tool }) {
  const result = decoded(tool.results), projection = tool.display_projection || {};
  const failed = ['failed','error'].includes(tool.status) || result?.success === false || /error|failed/i.test(JSON.stringify(result) || '');
  const pending = ['pending','running','in_progress'].includes(tool.status);
  const state = failed ? 'Failed' : pending ? 'Working' : ['completed','success'].includes(tool.status) ? 'Completed' : 'Waiting';
  const label = (failed ? projection.error_label : pending ? projection.active_label : projection.label) || `${tool.name || 'Agent action'} · ${state}`;
  if (projection.hide_details && projection.details_redacted) return <p className="text-xs text-muted-foreground mt-2">{label}</p>;
  return <details className="border rounded-lg p-3 mt-3 text-xs"><summary>{label}</summary><div className="mt-3 space-y-2"><p className="font-semibold">Request</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(decoded(tool.arguments_string),null,2) || 'No arguments'}</pre><p className="font-semibold">Result</p><pre className="whitespace-pre-wrap break-all">{result === undefined ? 'Awaiting result' : typeof result === 'string' ? result : JSON.stringify(result,null,2)}</pre></div></details>;
}