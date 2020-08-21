export type Data = number | null | string | Data[];

export const CR = '\r';
export const LF = '\n';
export const CRLF = `${CR}${LF}`;

// TODO: consider renaming this to prefix
export enum RESPType {
  SimpleString = '+',
  Error = '-',
  Integer = ':',
  BulkString = '$',
  Array = '*',
}

// TODO: pull from prefixes
export const OK = `+OK${CRLF}`;
export const NULL = `$-1${CRLF}`;
