import { CRLF, RESPType } from './constants';

type Token = {
  value: number | string | (string | number)[];
  readIndex: number;
};

export function decode(value: Buffer): number | string | (string | number)[] {
  const { value: result, readIndex } = parse(value);

  if (readIndex !== value.length) {
    throw new Error('read values do not match buffer length');
  }

  if (result instanceof Array) {
    return result;
  }

  return result;
}

// TODO: account for inline commands, support telnet
function parse(value: Buffer, readIndex = 0): Token {
  const type = String.fromCharCode(value.readUInt8(readIndex));
  readIndex++;

  switch (type) {
    case RESPType.SimpleString:
      return decodeSimpleString(value, readIndex);
    case RESPType.BulkString:
      return decodeBulkString(value, readIndex);
    case RESPType.Array:
      return decodeArray(value, readIndex);
    case RESPType.Integer:
      return decodeInteger(value, readIndex);
    case RESPType.Error:
      decodeError(value, readIndex);
      break;
    default:
      throw new Error(`unknown data type prefix '${type}'`);
  }
}

// TODO: clean up implementation
function readString(value: Buffer, position = 0): string {
  let token = '';
  let readIndex = position;
  let char = '';

  while (char !== '\r') {
    token += char;
    char = String.fromCharCode(value.readUInt8(readIndex));
    readIndex++;
  }

  const nextByte = String.fromCharCode(value.readUInt8(readIndex));
  if (nextByte !== '\n') throw new Error('bad');
  readIndex++;

  return token;
}

function decodeSimpleString(value: Buffer, readIndex: number): Token {
  const token = readString(value, readIndex);

  return {
    value: token,
    readIndex: readIndex + token.length + CRLF.length,
  };
}

function decodeBulkString(value: Buffer, readIndex: number): Token {
  const token = readString(value, readIndex);
  const bytes = parseInt(token, 10);
  readIndex += token.length + CRLF.length;

  // TODO: return null byte that conforms with RESP
  if (bytes === -1) {
    return null;
  }

  const bulkString = readString(value, readIndex);
  readIndex += bytes + CRLF.length;

  return {
    value: bulkString,
    readIndex,
  };
}

function decodeArray(value: Buffer, readIndex: number): Token {
  const token = readString(value, readIndex);
  const count = parseInt(token, 10);
  readIndex += token.length + CRLF.length;

  const elements = [];
  for (let i = 0; i < count; i++) {
    const token = parse(value, readIndex);
    readIndex = token.readIndex;
    elements.push(token.value);
  }

  return {
    value: elements,
    readIndex,
  };
}

function decodeInteger(value: Buffer, readIndex: number): Token {
  const token = readString(value, readIndex);
  const integer = parseInt(token, 10);
  readIndex += token.length + CRLF.length;

  return {
    value: integer,
    readIndex,
  };
}

function decodeError(value: Buffer, readIndex: number): Token {
  const error = readString(value, readIndex);

  throw new Error(error);
}
