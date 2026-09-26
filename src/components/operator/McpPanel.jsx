import React from 'react';
import { Network, Download, LockKeyhole, ListTodo, Monitor } from 'lucide-react';
import BrandButton from '@/components/operator/BrandButton';
import downloadCompanion from '@/components/operator/companionBundle';
const steps = [
  { Icon: LockKeyhole, title: '1. Publish and pair', text: 'Publish the app, then open Connected systems to download and run your private pairing kit.' },
  { Icon: ListTodo, title: '2. Connect your AI client', text: 'Copy the exact server address from the app’s MCP page after publishing. Add it to a compatible client and approve OAuth access.' },
  { Icon: Network, title: '3. Act and verify', text: 'Use computer_control to list devices, send an action, then poll its command ID for a completion receipt. Never treat queued as completed.' }
];
export default function McpPanel() {
  return <div className="space-y-6">
    <section className="operator-panel p-7 sm:p-10">
      <div className="flex items-start justify-between gap-3"><div className="brand-board-icon"><Network className="w-6 h-6" /></div><span className="brand-pill">OAuth configured</span></div>
      <h2 className="text-2xl font-bold mt-6">Your AI agent. Your computer. Connected.</h2>
      <p className="mt-4 text-sm text-muted-foreground max-w-2xl">The app’s remote MCP tool can list your paired computers, send mouse, keyboard, URL, and Cloud Browser actions, and read execution receipts. Sign-in and administrator access are required.</p>
      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {steps.map(({ Icon, title, text }) => <div key={title} className="border-t pt-5"><Icon className="w-5 h-5 mb-4" /><h3 className="text-sm font-semibold">{title}</h3><p className="text-sm text-muted-foreground mt-2">{text}</p></div>)}
      </div>
      <p className="text-xs text-muted-foreground border-t pt-5 mt-7">App records are also exposed through permission-checked MCP tools. Turn individual tools off on the MCP page. Publishing changes to the exposed tools requires connected clients to authorize again.</p>
    </section>
    <section className="operator-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4"><Monitor className="w-6 h-6 shrink-0" /><div><h3 className="font-bold text-lg">Local MCP: see the screen and act</h3><p className="text-sm text-muted-foreground mt-2 max-w-2xl">For a desktop AI client that supports stdio MCP, the local kit supplies screenshots directly to the client, plus click, type, hotkey, scroll, and Cloud Browser tools. No public screenshot uploads or Base44 AI integration calls are involved.</p></div></div>
        <BrandButton variant="outline" onClick={() => downloadCompanion()}><Download />Download local MCP kit</BrandButton>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Run the kit’s setup launcher and import the generated mcp-config.json into your local MCP client. Remote web clients use the app’s OAuth MCP instead; they receive action receipts, not desktop screenshots.</p>
    </section>
    <div className="operator-panel p-6"><h3 className="font-semibold text-sm">Persistent execution, with clear limits</h3><p className="text-sm text-muted-foreground mt-2">The companion keeps polling while it is running and reconnects after a network interruption. Your computer must stay awake and signed in. The external AI client supplies planning and reasoning; saved goals do not start an AI loop on their own. Cloud schedules still require available automation credits.</p></div>
  </div>;
}