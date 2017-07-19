import WebSocket from 'ws';
import MultiplexWebSocket from './lib/multiplex-ws';

const wss = new WebSocket.Server({
    port: '8765'
});

const getClientSocket = () => {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('http://localhost:8765');
        ws.on('open', () => resolve(ws));
        ws.on('error', reject);
    });
};

const getServerSocket = () => {
    return new Promise(resolve => wss.once('connection', resolve));
};

const getMultiplexedWS = async () => {
    console.log('run');
    const [cws, sws] = await Promise.all([getClientSocket(), getServerSocket()]);
    console.log('connected');
    return {
        client: new MultiplexWebSocket(cws),
        server: new MultiplexWebSocket(sws)
    };
};

const run = async () => {
    const { client, server } = await getMultiplexedWS();

    const serverChannel1 = server.channel();
    const serverChannel2 = server.channel();
    serverChannel2.send(Buffer.from('bar baz'));
    serverChannel1.send(Buffer.from('foo bar'));
    serverChannel1.send(Buffer.from('close me'));
    serverChannel1.on('close', () => console.log('serverChannel1 closed by client!'));
    serverChannel2.close();

    client.on('channel', channel => {
        console.log(`new channeld ${channel.id} opened`);
        channel.on('message', data => {
            console.log(`received on channel ${channel.id}: ${data.toString()}`);
            if (data.toString() === 'close me') {
                channel.close();
            }
        });
        channel.on('close', () => console.log(`channel ${channel.id} was closed`));
    });
};

wss.on('listening', run);
