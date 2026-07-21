/** Actual field-mapping service endpoint. */
export const FIELD_MAPPING_API_URL =
  'http://52.172.32.88:8095/api/v1/field-mapping'

/**
 * Dev-only proxy path. Vite rewrites this to {@link FIELD_MAPPING_API_URL}.
 * @see vite.config.ts server.proxy['/api-mapping']
 */
const FIELD_MAPPING_DEV_PROXY_URL = '/api-mapping/field-mapping'

const FIELD_MAPPING_HOSTS = new Set(['52.172.32.88', 'demoapp.ezofis.com'])

export function getFieldMappingApiUrl(): string | null {
  if (typeof window === 'undefined') return null

  const { hostname, protocol } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.DEV
      ? FIELD_MAPPING_DEV_PROXY_URL
      : FIELD_MAPPING_API_URL
  }

  if (!FIELD_MAPPING_HOSTS.has(hostname)) {
    return null
  }

  // HTTPS cannot call the HTTP service directly; same-origin proxy must forward
  // /api-mapping/field-mapping -> http://52.172.32.88:8095/api/v1/field-mapping
  if (protocol === 'https:') {
    return FIELD_MAPPING_DEV_PROXY_URL
  }

  return FIELD_MAPPING_API_URL
}
