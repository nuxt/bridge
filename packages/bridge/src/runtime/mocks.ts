const mock = () => () => { throw new Error('not implemented') }

export const useAsyncData = mock()
export const useFetch = mock()
export const useHydration = mock()
