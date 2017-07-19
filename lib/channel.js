import EventEmitter from 'events';

export default class Channel extends EventEmitter {
    constructor(id, onSend, onClose) {
        super();
        this.id = id.toString('hex');
        this.onSend = onSend;
        this.onClose = onClose;
    }

    close() {
        this.onClose();
    }

    send(data) {
        this.onSend(data);
    }
}
