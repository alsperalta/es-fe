/**
 * useApi.js
 * Central query/mutation hooks. All data-fetching lives here, not in components.
 * Components call these hooks and get back typed data + status — never raw fetch.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  packagesApi,
  clientsApi,
  quotationsApi,
  savedCalcsApi,
} from '../api/endpoints'

// ── Query keys — single source of truth to prevent stale cache bugs ──────────
export const QK = {
  packages:     ['packages'],
  clients:      ['clients'],
  quotations:   ['quotations'],
  quotation:    (id) => ['quotations', id],
  metrics:      ['metrics'],
  savedCalcs:   ['savedCalcs'],
}

// ── Packages ─────────────────────────────────────────────────────────────────

export function usePackages() {
  return useQuery({
    queryKey: QK.packages,
    queryFn:  packagesApi.getAll,
    staleTime: 30_000,
  })
}

export function useCreatePackage(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: packagesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.packages })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

export function useUpdatePackage(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => packagesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.packages })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

export function useDeletePackage(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: packagesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.packages })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery({
    queryKey: QK.clients,
    queryFn:  clientsApi.getAll,
    staleTime: 30_000,
  })
}

export function useCreateClient(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clients })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

export function useUpdateClient(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clients })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

export function useDeleteClient(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clients })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

// ── Quotations ────────────────────────────────────────────────────────────────

export function useQuotations() {
  return useQuery({
    queryKey: QK.quotations,
    queryFn:  quotationsApi.getAll,
    staleTime: 15_000,
  })
}

export function useMetrics() {
  return useQuery({
    queryKey: QK.metrics,
    queryFn:  quotationsApi.getMetrics,
    staleTime: 60_000,
    // Metrics can be slightly stale — reduce refetch pressure
    refetchOnWindowFocus: false,
  })
}

export function useCreateQuotation(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quotationsApi.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.quotations })
      qc.invalidateQueries({ queryKey: QK.metrics })
      options.onSuccess?.(data)
    },
    onError: options.onError,
  })
}

export function useUpdateQuotation(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => quotationsApi.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.quotations })
      qc.invalidateQueries({ queryKey: QK.quotation(data.id) })
      qc.invalidateQueries({ queryKey: QK.metrics })
      options.onSuccess?.(data)
    },
    onError: options.onError,
  })
}

export function useUpdateQuotationStatus(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => quotationsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.quotations })
      qc.invalidateQueries({ queryKey: QK.metrics })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

export function useDeleteQuotation(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: quotationsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.quotations })
      qc.invalidateQueries({ queryKey: QK.metrics })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

// ── Saved Calculations ────────────────────────────────────────────────────────

export function useSavedCalcs() {
  return useQuery({
    queryKey: QK.savedCalcs,
    queryFn:  savedCalcsApi.getAll,
    staleTime: 60_000,
  })
}

export function useCreateSavedCalc(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: savedCalcsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.savedCalcs })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}

export function useDeleteSavedCalc(options = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: savedCalcsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.savedCalcs })
      options.onSuccess?.()
    },
    onError: options.onError,
  })
}
