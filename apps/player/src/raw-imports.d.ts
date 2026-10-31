/** Vite `?raw` imports, used by specs to inspect source files as text. */
declare module '*?raw' {
  const content: string;
  export default content;
}
