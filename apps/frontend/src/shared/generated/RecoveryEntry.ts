// Generated from Rust OpenAPI. Run python tools/generate_types.py.
import type { Fault } from './Fault';
export type RecoveryEntry = {
  "diagnostics": Array<Fault>;
  "id": string;
  "name": string;
  "revision": number;
};
