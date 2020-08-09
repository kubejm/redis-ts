import RedisServer from '../server';
import { createConnection, Server, Socket } from 'net';
import * as cmd from '../cmd';

jest.mock('../cmd/echo');
jest.mock('../cmd/get');

describe('server', () => {
  let redisServer: RedisServer;
  let server: Server;
  let client: Socket;
  let request: Promise<Buffer>;

  beforeEach(async () => {
    redisServer = new RedisServer();
    server = redisServer.listen(3999);

    request = new Promise((resolve) => {
      server.on('connection', (socket) => {
        socket.on('data', resolve);
      });
    });

    client = await new Promise((resolve) => {
      const c = createConnection(3999, '127.0.0.1', () => {
        resolve(c);
      });
    });
  });

  afterEach(() => {
    client.destroy();
    server.close();
    jest.clearAllMocks();
  });

  it('should invoke the echo command with a echo request', async () => {
    client.write(Buffer.from('*2\r\n$4\r\nECHO\r\n$4\r\ntest\r\n'));
    await request;

    const mockExecute = (cmd.Echo as jest.Mock).mock.instances[0].execute.mock;
    const executeClient = mockExecute.calls[0][0];
    const executeRequest = mockExecute.calls[0][1];

    expect(executeClient instanceof Socket).toBeTruthy();
    expect(executeClient.server).toBe(server);
    expect(executeRequest).toStrictEqual(['ECHO', 'test']);
  });

  it('should invoke the get command with a get request', async () => {
    client.write(Buffer.from('*2\r\n$3\r\nGET\r\n$4\r\ntest\r\n'));
    await request;

    const mockExecute = (cmd.Get as jest.Mock).mock.instances[0].execute.mock;
    const executeClient = mockExecute.calls[0][0];
    const executeRequest = mockExecute.calls[0][1];

    expect(executeClient instanceof Socket).toBeTruthy();
    expect(executeClient.server).toBe(server);
    expect(executeRequest).toStrictEqual(['GET', 'test']);
  });
});
