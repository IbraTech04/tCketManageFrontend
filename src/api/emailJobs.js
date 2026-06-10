import { api } from './client';

export const emailJobsApi = {
  getStatus: (jobId) => api.get(`/email-jobs/${jobId}`),
};
