export function def (obj: any, key: string, val: any, enumerable: boolean = true): any {
  return Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}
