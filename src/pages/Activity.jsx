import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OperatorShell from '@/components/operator/OperatorShell';
import BrandButton from '@/components/operator/BrandButton';
import ActivityStatus from '@/components/operator/ActivityStatus';
import HealingLog from '@/components/operator/HealingLog';
import useOperatorData from '@/components/operator/useOperatorData';
export default function Activity() {
  const navigate = useNavigate(), data = useOperatorData();
  const audits = useQuery({ queryKey: ['operator-activity-audits'], queryFn: () => base44.entities.OperatorAudit.list('-created_date', 30), enabled: data.user?.role === 'admin', refetchInterval: 15000 });
  const refresh = async () => { await Promise.all([audits.refetch(), data.refresh()]); };
  if (data.loading) return <div className="min-h-screen flex items-center justify-center gap-3 text-sm"><Loader2 className="w-5 h-5 animate-spin"/>Loading your workspace…</div>;
  if (!data.user || data.user.role !== 'admin') return <div className="max-w-lg mx-auto p-8 mt-20 text-center"><ShieldCheck className="h-10 w-10 mx-auto mb-6"/><h1 className="text-2xl font-bold">Administrator access required</h1></div>;
  return <OperatorShell view="activity" onNavigate={key => navigate(key === 'overview' ? '/' : `/?view=${key}`)} user={data.user}>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7"><div><h1 className="text-3xl font-bold">Agent activity</h1><p className="text-sm text-muted-foreground mt-2">Recent audit results, reported work, and safe recovery history. Updates approximately every 15–30 seconds.</p></div><BrandButton variant="outline" onClick={refresh} disabled={audits.isFetching}><RefreshCw className={audits.isFetching ? 'animate-spin' : ''}/>Refresh</BrandButton></div>
    {(data.error || audits.error) && <p role="alert" className="operator-panel p-4 mb-6 text-sm">{data.error?.message || audits.error?.message} <button className="underline ml-2" onClick={refresh}>Retry</button></p>}
    {audits.isPending ? <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/>Loading activity…</p> : <div className="space-y-6"><ActivityStatus data={data} audits={audits.data || []}/><HealingLog audits={audits.data || []}/></div>}
  </OperatorShell>;
}