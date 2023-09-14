import { useHead } from '@unhead/vue'
import type { ComputedGetter } from '@vue/reactivity'
import type { MetaObject } from '@nuxt/schema'

// TODO: remove useMeta support when Nuxt 3 is stable
/** @deprecated Please use new `useHead` composable instead */
export function useMeta (meta: MetaObject | ComputedGetter<MetaObject>) {
  return useHead(meta)
}
