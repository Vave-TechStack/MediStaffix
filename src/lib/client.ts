"use client";

/**
 * Browser-side API client and data hooks.
 *
 * All writes go to the server and the affected queries are invalidated, so the
 * UI never mutates local state optimistically in a way that could disagree with
 * the stored record.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; fieldErrors?: Record<string, string> };
    throw new ApiError(payload.error ?? `Request failed (${res.status})`, res.status, payload.fieldErrors);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, params?: Record<string, string | number | undefined | null>) => {
    const url = new URL(path, window.location.origin);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      }
    }
    return request<T>(url.pathname + url.search);
  },
  post: <T,>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
  action: <T,>(action: string, body: Record<string, unknown> = {}) => request<T>(`/api/actions/${action}`, { method: "POST", body: JSON.stringify(body) }),
};

export interface ListResponse<T = Record<string, unknown>> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface QueryState {
  q: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  filters: Record<string, string>;
}

export const emptyQuery: QueryState = { q: "", page: 1, pageSize: 25, sort: "", dir: "desc", filters: {} };

export function useResourceList<T = Record<string, unknown>>(
  resource: string | null,
  query: QueryState,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? Boolean(resource);
  const [data, setData] = useState<ListResponse<T> | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const firstLoad = useRef(true);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  // `filters` is an object, so the effect depends on its serialised form rather
  // than its identity — otherwise every render would refetch.
  const filterKey = JSON.stringify(query.filters);

  useEffect(() => {
    if (!resource || !enabled) return;
    let cancelled = false;
    if (firstLoad.current) setLoading(true);
    firstLoad.current = false;
    api
      .get<ListResponse<T>>(`/api/${resource}`, {
        q: query.q || undefined,
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort || undefined,
        dir: query.dir,
        ...Object.fromEntries(Object.entries(query.filters).map(([k, v]) => [`f_${k}`, v])),
      })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `query.filters` is intentionally read through `filterKey`; see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, enabled, query.q, query.page, query.pageSize, query.sort, query.dir, filterKey, nonce]);

  return { data, loading, error, refetch, setData };
}

export function useAggregate<T = Record<string, unknown>>(key: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<T>(`/api/aggregate/${key}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, refetch: () => setNonce((n) => n + 1) };
}

/** Toast wrapper used by every mutation so error handling is consistent. */
export async function runAction<T>(
  fn: () => Promise<T>,
  messages: { success: string; error?: string },
  onDone?: (result: T) => void
) {
  try {
    const result = await fn();
    toast.success(messages.success);
    onDone?.(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : messages.error ?? "The operation failed.";
    toast.error(message);
    throw error;
  }
}
