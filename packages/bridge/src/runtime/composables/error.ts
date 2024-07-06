import { createError as _createError, H3Error } from 'h3'
import { toRef } from 'vue'
import { useNuxtApp } from '../nuxt'
// @ts-expect-error virtual file
import { nuxtDefaultErrorValue } from '#build/nuxt.config.mjs'

export const useError = () => toRef(useNuxtApp().payload, 'error')

export interface NuxtError<DataT = unknown> extends H3Error<DataT> {}

export const showError = <DataT = unknown>(
  _err: string | Error | (Partial<NuxtError<DataT>> & {
    status?: number;
    statusText?: string;
  })
) => {
  const err = createError(_err)

  try {
    const nuxtApp = useNuxtApp()
    nuxtApp.callHook('app:error', err)
    const error = useError()
    error.value = error.value || err
  } catch {
    throw err
  }

  return err
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
  error.value = nuxtDefaultErrorValue
}

export const isNuxtError = (err?: string | object): err is NuxtError => !!(err && typeof err === 'object' && ('__nuxt_error' in err))

export const createError = <DataT = unknown>(
  err: string | Error | (Partial<NuxtError<DataT>> & {
    status?: number;
    statusText?: string;
  })
): NuxtError => {
  const _err: NuxtError = _createError(err)
    ; (_err as any).__nuxt_error = true
  return _err
}
