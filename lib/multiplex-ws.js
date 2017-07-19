import EventEmitter from 'events';
import { randomBytes } from 'crypto';
import Channel from './channel';

const CHANNEL_OPENED = Buffer.from('00', 'hex');
const CHANNEL_CLOSED = Buffer.from('01', 'hex');
const CHANNEL_DATA = Buffer.from('03', 'hex');

const getType = data => data.slice(0, 1);
const getChannelId = data => data.slice(1, 5);
const getData = data => data.slice(5);

const setChannel = (channels, channelId, channel) => channels.set(channelId.toString('hex'), channel);
const getChannel = (channels, channelId) => channels.get(channelId.toString('hex'));

const createChannel = (channelId, channels, ws) => {
    const channel = new Channel(
        channelId,
        data => ws.send(Buffer.concat([CHANNEL_DATA, channelId, data])),
        () => ws.send(Buffer.concat([CHANNEL_CLOSED, channelId]))
    );
    setChannel(channels, channelId, channel);
    return channel;
};

export default class MultiplexWebSocket extends EventEmitter {
    constructor(ws) {
        super();
        this.channels = new Map();
        this.ws = ws;
        this.ws.on('message', data => this.dispatch(data));
    }

    dispatch(data) {
        const type = getType(data);
        const channelId = getChannelId(data);
        if (CHANNEL_OPENED.equals(type)) {
            const channel = createChannel(channelId, this.channels, this.ws);
            this.emit('channel', channel);
            return;
        }
        if (CHANNEL_DATA.equals(type)) {
            const channel = getChannel(this.channels, channelId);
            if (channel) {
                channel.emit('message', getData(data));
            }
            return;
        }
        if (CHANNEL_CLOSED.equals(type)) {
            const channel = getChannel(this.channels, channelId);
            if (channel) {
                this.channels.delete(channelId);
                channel.emit('close');
            }
            return;
        }
    }

    channel() {
        const channelId = randomBytes(4);
        const channel = createChannel(channelId, this.channels, this.ws);
        this.ws.send(Buffer.concat([CHANNEL_OPENED, channelId]));
        return channel;
    }
}
