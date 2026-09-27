import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export default function useOperatorData() {
  const client = useQueryClient();
  const user = useQuery({queryKey:['operator-user'],queryFn:() => base44.auth.me()});
  const admin = user.data?.role === 'admin';
  useEffect(() => {
    if (!admin) return;
    const unsubscribeTasks=base44.entities.OperatorTask.subscribe(()=>client.invalidateQueries({queryKey:['operator-tasks']}));
    const unsubscribeCommands=base44.entities.ComputerCommand.subscribe(()=>client.invalidateQueries({queryKey:['operator-commands']}));
    return () => { unsubscribeTasks(); unsubscribeCommands(); };
  }, [admin, client]);
  const tasks = useQuery({queryKey:['operator-tasks'],queryFn:() => base44.entities.OperatorTask.list('-created_date',200), enabled:admin, refetchInterval:30000});
  const schedules = useQuery({queryKey:['operator-schedules'],queryFn:() => base44.entities.OperatorSchedule.list('-created_date',50), enabled:admin, refetchInterval:30000});
  const accounts = useQuery({queryKey:['operator-accounts'],queryFn:() => base44.entities.GoogleAccount.list('-created_date',200), enabled:admin, refetchInterval:30000});
  const devices = useQuery({queryKey:['operator-devices'],queryFn:async() => (await base44.functions.invoke('operatorDevices',{operation:'list'})).data.devices, enabled:admin, refetchInterval:8000});
  const commands = useQuery({queryKey:['operator-commands'],queryFn:() => base44.entities.ComputerCommand.list('-created_date',100), enabled:admin, refetchInterval:5000});
  const refresh = () => Promise.all(['operator-tasks','operator-schedules','operator-accounts','operator-devices','operator-commands'].map(key=>client.invalidateQueries({queryKey:[key]})));
  const updateTask = useMutation({mutationFn:({id,status}) => base44.entities.OperatorTask.update(id,{status}),onSuccess:refresh});
  const updateSchedule = useMutation({mutationFn:({id,enabled}) => base44.entities.OperatorSchedule.update(id,{enabled}),onSuccess:refresh});
  return {user:user.data, tasks:tasks.data||[], schedules:schedules.data||[], accounts:accounts.data||[], devices:devices.data||[], commands:commands.data||[], loading:user.isPending||(admin&&(tasks.isPending||schedules.isPending||accounts.isPending)), error:user.error||tasks.error||schedules.error||accounts.error||devices.error||commands.error||updateTask.error||updateSchedule.error, refresh, updateTask, updateSchedule};
}