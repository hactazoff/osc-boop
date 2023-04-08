import { Server, Client, Message } from 'node-osc';
import { request } from 'undici';
import { readFileSync, stat, writeFileSync } from 'fs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface StatsList { [index: string]: Stats };
interface RawStats { [index: string]: string };
interface Stats { local_count: bigint, last_update: Date, active_value: boolean, live_count: bigint };
interface OutEvent { name: string, time: Date };
interface InEvent extends OutEvent { type: "OUT" | "IN" | "SUCCESS" | "REFUSE" | "OFFLINE" };

export class OSCBOOP {
    constructor(config: any) {
        this._config = config;

        this._osc = {
            client: new Client(this.config.ADDRESS_SENDING, this.config.PORT_SENDING),
            server: new Server(this.config.PORT_LISTENING, this.config.ADDRESS_LISTENING)
        }
    }

    private _config: any;
    public get config(): any {
        return this._config
    }

    private _osc: { client: Client, server: Server };
    public get client(): Client {
        return this._osc.client
    }
    public get server(): Server {
        return this._osc.server
    }

    private _stats: StatsList = {};
    public get stats(): StatsList {
        if (Object.keys(this._stats).length == 0) {

            var stats: RawStats = {};
            try {
                stats = JSON.parse(readFileSync(this.config.LOCAL_STATS_FILE, 'utf-8'));
            } catch { }
            this._stats = {};
            for (const name of this.allPatameter())
                this._stats[name] = { local_count: isNaN(Number(stats[name])) ? 0n : BigInt(stats[name]), live_count: 0n, last_update: new Date(0), active_value: false };
        }
        return this._stats
    }

    public async listening(): Promise<boolean> {
        for (var tri = 0; tri <= this.config.PORT_LISTENING_TRY; tri++)
            if (await new Promise(r => this.server.on('listening', (err: any) => r(!err)))) {
                console.log(`Listening on ${this.config.ADDRESS_LISTENING}:${this.config.PORT_LISTENING} !`);
                this._ready();
                return true;
            } else console.warn(`Error to listening, new tentative in ${(this.config.PORT_LISTENING_DELAI_RETRY / 1e3).toFixed(2)}s...`);
        console.error('Error to listening, exiting');

        return false;
    }

    public save(): void {
        console.log(this.config, this.stats)
        return writeFileSync(this.config.LOCAL_STATS_FILE, ((e: StatsList, o: any) => {
            for (const k of Object.keys(e))
                o[k] = e[k].local_count.toString()
            return JSON.stringify(o);
        })(this.stats, {}), 'utf-8');
    }

    public allPatameter(): string[] {
        return Object.keys(this.config.PARAMETER_NAMES)
    }
    public parseParameter(name: string, type: string) {
        return config.PARAMETER_SCHEMATIC.replace('{TYPE}', this.config.PARAMETER_TYPES[type]).replace('{NAME}', this.config.PARAMETER_NAMES[name])
    };

    private _ready(): void {
        this.server.on('message', msg => this._onMessage(msg[0], msg[1]));
        setInterval(() => this.sendChatbox(), 1e4);
        setInterval(() => this.save(), 36e4);
    }

    private _onMessage(parameter: string, value: any): void {
        if (typeof value == 'boolean')
            for (const name of this.allPatameter())
                if (parameter === this.parseParameter(name, "IN"))
                    this._onChangeValue(name, value)
    }

    private _onChangeValue(name: string, value: boolean) {
        var stats: Stats = this.stats[name];
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

    private _waittingEvents: OutEvent[] = [];
    private _addEvent(name: string): void {
        this._waittingEvents.push({
            name: name,
            time: new Date()
        });

        if (!this.in_upload)
            this._uploadEvents();
    }

    private _in_upload: boolean = false;
    public get in_upload(): boolean {
        return this._in_upload
    }

    private _historyEvents: InEvent[] = [];
    public get historyEvents(): InEvent[] {
        return this._historyEvents = this._historyEvents.filter(({ time }) => time.getTime() > Date.now() - 6e4);
    }
    private async _uploadEvents(nb_request: number = 0, nb_uploaded_events: number = 0): Promise<[number, number]> {
        this._in_upload = true;

        const queue = this._waittingEvents;
        this._waittingEvents = [];

        let body: { data: InEvent[], counter: RawStats };
        try {
            const response = await request(this.config.URL_SERVER + '/api/add', {
                method: 'POST',
                headers: {
                    'Token': config.TOKEN_SERVER,
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
        } catch (error) {
            body = {
                data: queue.map(e => ({ name: e.name, type: "OFFLINE", time: e.time })),
                counter: ((parse: RawStats) => {
                    for (const name of this.allPatameter())
                        parse[name] = this.stats[name].local_count.toString();
                    return parse
                })({})
            }
        };

        this._historyEvents.push(...body.data);

        for (const name of body.data.map(e => e.name)) {
            var stats: Stats = this._stats[name];
            stats.live_count = BigInt(body.counter[name]);
        }

        for (const { name, type } of body.data)
            await new Promise(resolve => this.client.send(new Message(this.parseParameter(name, type), true), resolve));

        await sleep(200);

        for (const { name, type } of body.data)
            await new Promise(resolve => this.client.send(new Message(this.parseParameter(name, type), false), resolve));

        nb_request++;
        nb_uploaded_events += body.data.length;

        if (this._waittingEvents.length > 0)
            return await this._uploadEvents(nb_request, nb_uploaded_events);

        await this.sendChatbox()
        this._in_upload = false;

        return [nb_request, nb_uploaded_events];
    }

    public parseDisplayname(name: string): string {
        return this.config.PARAMETER_DISPLAY_NAMES[name] ? this.config.PARAMETER_DISPLAY_NAMES[name] : name
    }

    private _last_time_chatbox = new Date(0);
    private _last_str_chatbox = "";
    public async sendChatbox(): Promise<void> {
        if (this.config.ENABLE_CHATBOX && (Date.now() - this._last_time_chatbox.getTime() > 1e3)) {
            const str = this.allPatameter()
                .filter(name => this.stats[name] && (Date.now() - this.stats[name].last_update.getTime() < 1e4))
                .map(name => this.parseDisplayname(name) + `: ` + this.stats[name].live_count).join('\n, ')
            if(str.length > 3 && str != this._last_str_chatbox) {
                this._last_time_chatbox = new Date();
                this._last_str_chatbox = str;
                await new Promise(resolve => this.client.send(new Message('/chatbox/input', this._last_str_chatbox, true), resolve));
                console.log(this._last_time_chatbox, this._last_str_chatbox);
            }
        };
        return;
    }
}