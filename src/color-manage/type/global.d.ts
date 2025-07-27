declare module 'application' {
  export const activeDocument = {
    name: string,
    guid: string,
  }
  export const editDocument: (callback: () => void) => void
}