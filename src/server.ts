import { createServer, Server, Socket } from 'net';
import { decode } from './resp/decoder';
import { encodeError } from './resp/encoder';
import * as cmd from './cmd';

export default class RedisServer {
  private commands: Map<string, cmd.RedisCommand>;

  constructor() {
    this.commands = new Map();
    this.registerCommands();
  }

  private registerCommands() {
    this.commands.set('echo', new cmd.Echo());
    this.commands.set('get', new cmd.Get());
    this.commands.set('ping', new cmd.Ping());
    this.commands.set('quit', new cmd.Quit());
    this.commands.set('set', new cmd.Set());

    // cloning map to avoid circular dependency
    this.commands.set('command', new cmd.Command(new Map(this.commands)));
  }

  private handleClientConnection(client: Socket): void {
    client.on('data', (data: Buffer) => {
      this.handleClientData(client, data);
    });
  }

  private handleClientData(client: Socket, data: Buffer): void {
    try {
      this.handleRequest(client, data);
    } catch (e) {
      const message = e.message ? e.message : 'unexpected error';
      console.error(`failed to handle request '${message}'`);
    }
  }

  private handleRequest(client: Socket, data: Buffer) {
    try {
      const request = decode(data);

      if (!Array.isArray(request)) {
        throw new Error(`ill-formed request`);
      }

      const commandName = String(request[0]);
      const command = this.commands.get(commandName.toLowerCase());

      if (!command) {
        throw new Error(`unknown command '${commandName}'`);
      }

      if (
        (command.arity > 0 && command.arity !== request.length) ||
        request.length < -command.arity
      ) {
        throw new Error(
          `wrong number of arguments for '${command.name}' command`
        );
      }

      command.execute(client, request);
    } catch (e) {
      const message = e.message ? e.message : 'unexpected error';
      const reply = encodeError(message);
      client.write(reply);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listen(...args: any[]): Server {
    return createServer()
      .on('connection', this.handleClientConnection.bind(this))
      .listen(...args);
  }
}
