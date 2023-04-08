"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSCBOOP = void 0;
const node_osc_1 = require("node-osc");
const undici_1 = require("undici");
const fs_1 = require("fs");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class OSCBOOP {
    constructor(config) {
        this._config = config;
        this._osc = {
            client: new node_osc_1.Client(this.config.ADDRESS_SENDING, this.config.PORT_SENDING),
            server: new node_osc_1.Server(this.config.PORT_LISTENING, this.config.ADDRESS_LISTENING)
        };
    }
    _config;
    get config() {
        return this._config;
    }
    _osc;
    get client() {
        return this._osc.client;
    }
    get server() {
        return this._osc.server;
    }
    _stats = {};
    get stats() {
        if (Object.keys(this._stats).length == 0) {
            var stats = {};
            try {
                stats = JSON.parse((0, fs_1.readFileSync)(this.config.LOCAL_STATS_FILE, 'utf-8'));
            }
            catch { }
            this._stats = {};
            for (const name of this.allPatameter())
                this._stats[name] = { local_count: isNaN(Number(stats[name])) ? 0n : BigInt(stats[name]), live_count: 0n, last_update: new Date(0), active_value: false };
        }
        return this._stats;
    }
    async listening() {
        for (var tri = 0; tri <= this.config.PORT_LISTENING_TRY; tri++)
            if (await new Promise(r => this.server.on('listening', (err) => r(!err)))) {
                console.log(`Listening on ${this.config.ADDRESS_LISTENING}:${this.config.PORT_LISTENING} !`);
                this._ready();
                return true;
            }
            else
                console.warn(`Error to listening, new tentative in ${(this.config.PORT_LISTENING_DELAI_RETRY / 1e3).toFixed(2)}s...`);
        console.error('Error to listening, exiting');
        return false;
    }
    save() {
        console.log(this.config, this.stats);
        return (0, fs_1.writeFileSync)(this.config.LOCAL_STATS_FILE, ((e, o) => {
            for (const k of Object.keys(e))
                o[k] = e[k].local_count.toString();
            return JSON.stringify(o);
        })(this.stats, {}), 'utf-8');
    }
    allPatameter() {
        return Object.keys(this.config.PARAMETER_NAMES);
    }
    parseParameter(name, type) {
        return this.config.PARAMETER_SCHEMATIC.replace('{TYPE}', this.config.PARAMETER_TYPES[type]).replace('{NAME}', this.config.PARAMETER_NAMES[name]);
    }
    ;
    _ready() {
        this.server.on('message', (msg) => this._onMessage(msg[0], msg[1]));
        setInterval(() => this.sendChatbox(), 1e4);
        setInterval(() => this.save(), 36e4);
    }
    _onMessage(parameter, value) {
        if (typeof value == 'boolean')
            for (const name of this.allPatameter())
                if (parameter === this.parseParameter(name, "IN"))
                    this._onChangeValue(name, value);
    }
    _onChangeValue(name, value) {
        var stats = this.stats[name];
        if (stats.active_value !== value) {
            stats.last_update = new Date();
            if (value)
                stats.local_count++;
            this._stats[name] = stats;
            //this.client.send(new Message(this.parseParameter(name, "OUT"), value));
            if (value)
                this._addEvent(name);
        }
    }
    _waittingEvents = [];
    _addEvent(name) {
        this._waittingEvents.push({
            name: name,
            time: new Date()
        });
        if (!this.in_upload)
            this._uploadEvents();
    }
    _in_upload = false;
    get in_upload() {
        return this._in_upload;
    }
    _historyEvents = [];
    get historyEvents() {
        return this._historyEvents = this._historyEvents.filter(({ time }) => time.getTime() > Date.now() - 6e4);
    }
    async _uploadEvents(nb_request = 0, nb_uploaded_events = 0) {
        this._in_upload = true;
        const queue = this._waittingEvents;
        this._waittingEvents = [];
        let body;
        try {
            const response = await (0, undici_1.request)(this.config.URL_SERVER + '/api/add', {
                method: 'POST',
                headers: {
                    'Token': this.config.TOKEN_SERVER,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: queue,
                    time: new Date()
                })
            });
            if (response.statusCode != 200)
                throw '';
            body = await response.body.json();
        }
        catch (error) {
            body = {
                data: queue.map(e => ({ name: e.name, type: "OFFLINE", time: e.time })),
                counter: ((parse) => {
                    for (const name of this.allPatameter())
                        parse[name] = this.stats[name].local_count.toString();
                    return parse;
                })({})
            };
        }
        ;
        this._historyEvents.push(...body.data);
        for (const name of body.data.map(e => e.name)) {
            var stats = this._stats[name];
            stats.live_count = BigInt(body.counter[name]);
        }
        for (const { name, type } of body.data)
            await new Promise(resolve => this.client.send(new node_osc_1.Message(this.parseParameter(name, type), true), resolve));
        await sleep(200);
        for (const { name, type } of body.data)
            await new Promise(resolve => this.client.send(new node_osc_1.Message(this.parseParameter(name, type), false), resolve));
        nb_request++;
        nb_uploaded_events += body.data.length;
        if (this._waittingEvents.length > 0)
            return await this._uploadEvents(nb_request, nb_uploaded_events);
        await this.sendChatbox();
        this._in_upload = false;
        return [nb_request, nb_uploaded_events];
    }
    parseDisplayname(name) {
        return this.config.PARAMETER_DISPLAY_NAMES[name] ? this.config.PARAMETER_DISPLAY_NAMES[name] : name;
    }
    _last_time_chatbox = new Date(0);
    _last_str_chatbox = "";
    async sendChatbox() {
        if (this.config.ENABLE_CHATBOX && (Date.now() - this._last_time_chatbox.getTime() > 1e3)) {
            const str = this.allPatameter()
                .filter(name => this.stats[name] && (Date.now() - this.stats[name].last_update.getTime() < 1e4))
                .map(name => this.parseDisplayname(name) + `: ` + this.stats[name].live_count).join('\n, ');
            if (str.length > 3 && str != this._last_str_chatbox) {
                this._last_time_chatbox = new Date();
                this._last_str_chatbox = str;
                await new Promise(resolve => this.client.send(new node_osc_1.Message('/chatbox/input', this._last_str_chatbox, true), resolve));
                console.log(this._last_time_chatbox, this._last_str_chatbox);
            }
        }
        ;
        return;
    }
}
exports.OSCBOOP = OSCBOOP;
