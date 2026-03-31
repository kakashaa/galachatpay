/// <reference types="vite/client" />

declare module "svga-web" {
  export class Downloader {
    get(url: string): Promise<ArrayBuffer>;
  }
  export class Parser {
    do(data: ArrayBuffer): Promise<any>;
  }
  export class Player {
    constructor(canvas: HTMLCanvasElement | string);
    set(options: { loop: number; fillMode: string; [key: string]: any }): void;
    mount(data: any): void;
    start(): void;
    stop(): void;
    clear(): void;
    destroy(): void;
  }
  const SVGA: { Downloader: typeof Downloader; Parser: typeof Parser; Player: typeof Player };
  export default SVGA;
}
