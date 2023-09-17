#!/usr/bin/env node
require('@nuxt/cli').run()
  .catch((error) => {
    require('consola').fatal(error)
    require('exit')(2)
  })
