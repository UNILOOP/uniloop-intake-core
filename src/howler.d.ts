/**
 * Minimal ambient declaration for the `howler` package.
 *
 * The project intentionally avoids pulling in `@types/howler` as a dependency,
 * so this declaration keeps the import typed as `any` to satisfy the compiler.
 */
declare module 'howler' {
  export class Howl {
    constructor(options: any);
    [key: string]: any;
  }
  export const Howler: any;
}
