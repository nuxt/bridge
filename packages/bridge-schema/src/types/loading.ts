export type NuxtOptionsLoading = {
  /** CSS color of the progress bar. */
  color?: string
  /** Keep animating progress bar when loading takes longer than duration. */
  continuous?: boolean
  /** Set to `false` to remove default progress bar styles (and add your own). */
  css?: boolean
  /**
   * In ms, the maximum duration of the progress bar, Nuxt assumes that the
   * route will be rendered before 5 seconds.
   */
  duration?: number
  /**
   * CSS color of the progress bar when an error appended while rendering
   * the route (if data or fetch sent back an error, for example).
   */
  failedColor?: string
  /** Height of the progress bar (used in the style property of the progress bar). */
  height?: string
  /** Set the direction of the progress bar from right to left. */
  rtl?: boolean
  /**
   * In ms, wait for the specified time before displaying the progress bar.
   * Useful for preventing the bar from flashing.
   */
  throttle?: number
}

export type NuxtOptionsLoadingIndicator = {
  background?: string
  color?: string
  color2?: string
  name?: string
}
