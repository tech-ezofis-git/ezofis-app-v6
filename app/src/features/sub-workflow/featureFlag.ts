// Sub-workflow runs on mock data until the V6 API is ready, so its UI only
// shows on a local dev host (localhost, 127.0.0.1, [::1], *.localhost) and
// stays hidden everywhere else, e.g. https://cloud.ezofis.com.
// TODO: remove this switch (and every check of it) once the API is live.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const isSubWorkflowEnabled = (): boolean => {
  const hostname = globalThis.location?.hostname?.toLowerCase() ?? ''
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost')
}
