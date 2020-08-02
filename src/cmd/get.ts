import RedisCommand from './redis-command';
import { Socket } from 'net';
import { encodeBulkString } from '../resp/encoder';
import { get } from '../db';

export default class Get extends RedisCommand {
  constructor() {
    super('set', -3, ['write', 'denyoom'], 1, 1, 1);
  }

  execute(client: Socket, request: (number|string)[]) {
    const key = String(request[1]);
    const value = get(key);

    const reply = encodeBulkString(value);
    client.write(reply);
  }
}
