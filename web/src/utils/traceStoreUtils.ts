import { StoreConfig } from '../korrel8r-client';

export interface TraceContext {
  namespace: string;
  name: string;
  tenant: string;
}

/**
 * Extracts trace context (namespace, name, tenant) from the current URL.
 * These parameters are set when the user navigates to the traces console.
 */
export const extractTraceContext = (): TraceContext | null => {
  const searchParams = new URLSearchParams(window.location.search);

  // Check if we're on a traces page with tenant information
  const namespace = searchParams.get('namespace');
  const name = searchParams.get('name');
  const tenant = searchParams.get('tenant');

  // If any of these are missing, return null (not on traces page or no tenant selected)
  if (!namespace || !name || !tenant) {
    return null;
  }

  return { namespace, name, tenant };
};

/**
 * Builds a store configuration for the trace domain based on trace context.
 */
export const buildTraceStoreConfig = (context: TraceContext): StoreConfig => {
  const { namespace, name, tenant } = context;

  // Build the tempoStack URL with the tenant path
  // Format: https://tempo-{name}-gateway.{namespace}.svc.cluster.local:8080/api/traces/v1/{tenant}/tempo/api/search
  const tempoStackURL = `https://tempo-${name}-gateway.${namespace}.svc.cluster.local:8080/api/traces/v1/${tenant}/tempo/api/search`;

  return {
    domain: 'trace',
    tempoStack: tempoStackURL,
    certificateAuthority: '/var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt',
  };
};
