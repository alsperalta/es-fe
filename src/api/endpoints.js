import api from './client'

export const packagesApi = {
  getAll:  ()             => api.get('/packages'),
  getById: (id)           => api.get(`/packages/${id}`),
  create:  (data)         => api.post('/packages', data),
  update:  (id, data)     => api.put(`/packages/${id}`, data),
  delete:  (id)           => api.delete(`/packages/${id}`),
}

export const clientsApi = {
  getAll:  ()             => api.get('/clients'),
  getById: (id)           => api.get(`/clients/${id}`),
  create:  (data)         => api.post('/clients', data),
  update:  (id, data)     => api.put(`/clients/${id}`, data),
  delete:  (id)           => api.delete(`/clients/${id}`),
}

export const quotationsApi = {
  getAll:       ()              => api.get('/quotations'),
  getById:      (id)            => api.get(`/quotations/${id}`),
  create:       (data)          => api.post('/quotations', data),
  update:       (id, data)      => api.put(`/quotations/${id}`, data),
  delete:       (id)            => api.delete(`/quotations/${id}`),
  updateStatus: (id, status)    => api.patch(`/quotations/${id}/status`, { status }),
  getMetrics:   ()              => api.get('/quotations/metrics'),
}

export const savedCalcsApi = {
  getAll:  () => api.get('/saved-calculations'),
  create:  (data) => api.post('/saved-calculations', data),
  delete:  (id)   => api.delete(`/saved-calculations/${id}`),
}
