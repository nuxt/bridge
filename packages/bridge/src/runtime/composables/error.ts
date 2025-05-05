import { createError as createH3Error, H3Error } from 'h3'
import { toRef } from 'vue'
import { useNuxtApp } from '../nuxt'

export const NUXT_ERROR_SIGNATURE = '__nuxt_error'

export const useError = () => toRef(useNuxtApp().payload, 'error')

export interface NuxtError<DataT = unknown> extends H3Error<DataT> {}

export const showError = <DataT = unknown>(
  error: string | Error | Partial<NuxtError<DataT>>
) => {
  const nuxtError = createError<DataT>(error)

  try {
    const nuxtApp = useNuxtApp()
    nuxtApp.callHook('app:error', nuxtError)
    const error = useError()
    error.value = error.value || nuxtError
  } catch {
    throw nuxtError
  }

  return nuxtError
}

/** @deprecated Use `throw createError()` or `showError` */
export const throwError = showError

export const clearError = async (options: { redirect?: string } = {}) => {
  const nuxtApp = useNuxtApp()
  const error = useError()
  nuxtApp.callHook('app:error:cleared', options)
  if (options.redirect) {
    await nuxtApp.$router.replace(options.redirect)
  }
  error.value = null
}

export const isNuxtError = <DataT = unknown>(
  error?: string | object
): error is NuxtError<DataT> => (
    !!error && typeof error === 'object' && NUXT_ERROR_SIGNATURE in error
  )

export const createError = <DataT = unknown>(
  error: string | Partial<NuxtError<DataT>>
) => {
  const nuxtError: NuxtError<DataT> = createH3Error<DataT>(error)

  Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
    value: true,
    configurable: false,
    writable: false
  })

  return nuxtError
}
