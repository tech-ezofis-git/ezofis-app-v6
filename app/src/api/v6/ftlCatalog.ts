import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'

export type FtlCatalogProduct = {
  [key: string]: unknown
  category?: string
  currency?: string
  description?: string
  id?: string
  productCode?: string
  unitPrice?: number
}

export type FtlCatalogRequest = {
  productCode?: string
  searchKey?: string
}

export type FtlCatalogResponse = {
  mode?: 'codes' | 'details' | string
  product?: FtlCatalogProduct | null
  productCodes?: string[]
  /** Newer catalog details payload (preferred over singular `product`). */
  products?: FtlCatalogProduct[]
}

const tenantHeaders = () => {
  const state = authUserStore.getState()
  const tenantId =
    state?.session?.tenantId ||
    state?.identity?.tenantId ||
    (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('tenantId')
      : null)
  if (!tenantId) return undefined
  return { 'X-Tenant-Id': String(tenantId) }
}

export const fetchFtlCatalog = async (
  body: FtlCatalogRequest = {},
): Promise<FtlCatalogResponse> => {
  const { data } = await axiosV6({
    data: {
      productCode: body.productCode ?? '',
      searchKey: body.searchKey ?? '',
    },
    headers: tenantHeaders(),
    method: 'POST',
    url: '/ftl/catalog',
  })
  return (data || {}) as FtlCatalogResponse
}

export const fetchFtlCatalogCodes = async (searchKey = '') => {
  const res = await fetchFtlCatalog({ productCode: '', searchKey })
  return Array.isArray(res.productCodes) ? res.productCodes : []
}

export const fetchFtlCatalogProduct = async (productCode: string) => {
  if (!productCode.trim()) return null
  const res = await fetchFtlCatalog({ productCode, searchKey: '' })
  if (res.product) return res.product
  if (Array.isArray(res.products) && res.products.length > 0) {
    return res.products[0] || null
  }
  return null
}
