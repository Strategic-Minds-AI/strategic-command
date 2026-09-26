import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
export default function useOperatorData() {
  const client = useQueryClient();
  const user = useQuery({queryKey:['operator-user'],queryFn:() => base44.auth.me()});
  const admin = user.data?.role === 'admin';
  const tasks = useQuery({queryKey:['operator-tasks'],queryFn:() => base44.entities.OperatorTask.list('-created_date',200), enabled:admin, refetchInterval:30000});
  const schedules = useQuery({queryKey:['operator-schedules'],queryFn:() => base44.entities.OperatorSchedule.list('-created_date',50), enabled:admin, refetchInterval:30000});
  const refresh = () => Promise.all([client.invalidateQueries({queryKey:['operator-tasks']}),client.invalidateQueries({queryKey:['operator-schedules']})]);
  const updateTask = useMutation({mutationFn:({id,status}) => base44.entities.OperatorTask.update(id,{status}),onSuccess:refresh});
  const updateSchedule = useMutation({mutationFn:({id,enabled}) => base44.entities.OperatorSchedule.update(id,{enabled}),onSuccess:refresh});
  return {user:user.data, tasks:tasks.data||[], schedules:schedules.data||[], loading:user.isPending||(admin&&(tasks.isPending||schedules.isPending)), error:user.error||tasks.error||schedules.error||updateTask.error||updateSchedule.error, refresh, updateTask, updateSchedule};
}