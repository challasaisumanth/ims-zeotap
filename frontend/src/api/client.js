import axios from 'axios';

export const api = {
  getWorkItems: () => axios.get('/api/workitems/'),
  getWorkItem: (id) => axios.get(`/api/workitems/${id}`),
  transition: (id, state, rca = null) =>
    axios.patch(`/api/workitems/${id}/transition`, rca, {
      params: { new_state: state },
    }),
  ingestSignal: (signal) => axios.post('/api/signals/ingest', signal),
  health: () => axios.get('/health'),
};