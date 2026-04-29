import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}

if (typeof global.crypto === "undefined") {
  global.crypto = webcrypto;
}

const { build } = await import("vite");

await build();
