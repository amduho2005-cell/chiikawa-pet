import type { PetApi } from '../preload'

// Le cuenta a TypeScript que window.pet existe (lo crea el preload)
declare global {
  interface Window {
    pet: PetApi
  }
}
