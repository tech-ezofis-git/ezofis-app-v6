/**
 * A menu stays highlighted on its nested pages too (e.g. Reports on
 * /reports/:id); the root route only matches itself.
 */
const isMenuRouteActive = (pathname: string, route: string) => {
  if (route === '/') return pathname === '/'
  return pathname === route || pathname.startsWith(`${route}/`)
}

export default isMenuRouteActive
