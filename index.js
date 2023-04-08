"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.OSCBOOP = void 0;
var node_osc_1 = require("node-osc");
var undici_1 = require("undici");
var fs_1 = require("fs");
var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
;
;
;
;
;
var OSCBOOP = /** @class */ (function () {
    function OSCBOOP(config) {
        this._stats = {};
        this._waittingEvents = [];
        this._in_upload = false;
        this._historyEvents = [];
        this._last_time_chatbox = new Date(0);
        this._last_str_chatbox = "";
        this._config = config;
        this._osc = {
            client: new node_osc_1.Client(this.config.ADDRESS_SENDING, this.config.PORT_SENDING),
            server: new node_osc_1.Server(this.config.PORT_LISTENING, this.config.ADDRESS_LISTENING)
        };
    }
    Object.defineProperty(OSCBOOP.prototype, "config", {
        get: function () {
            return this._config;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OSCBOOP.prototype, "client", {
        get: function () {
            return this._osc.client;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OSCBOOP.prototype, "server", {
        get: function () {
            return this._osc.server;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OSCBOOP.prototype, "stats", {
        get: function () {
            if (Object.keys(this._stats).length == 0) {
                var stats = {};
                try {
                    stats = JSON.parse((0, fs_1.readFileSync)(this.config.LOCAL_STATS_FILE, 'utf-8'));
                }
                catch (_a) { }
                this._stats = {};
                for (var _i = 0, _b = this.allPatameter(); _i < _b.length; _i++) {
                    var name_1 = _b[_i];
                    this._stats[name_1] = { local_count: isNaN(Number(stats[name_1])) ? 0n : BigInt(stats[name_1]), live_count: 0n, last_update: new Date(0), active_value: false };
                }
            }
            return this._stats;
        },
        enumerable: false,
        configurable: true
    });
    OSCBOOP.prototype.listening = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tri;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tri = 0;
                        _a.label = 1;
                    case 1:
                        if (!(tri <= this.config.PORT_LISTENING_TRY)) return [3 /*break*/, 4];
                        return [4 /*yield*/, new Promise(function (r) { return _this.server.on('listening', function (err) { return r(!err); }); })];
                    case 2:
                        if (_a.sent()) {
                            console.log("Listening on ".concat(this.config.ADDRESS_LISTENING, ":").concat(this.config.PORT_LISTENING, " !"));
                            this._ready();
                            return [2 /*return*/, true];
                        }
                        else
                            console.warn("Error to listening, new tentative in ".concat((this.config.PORT_LISTENING_DELAI_RETRY / 1e3).toFixed(2), "s..."));
                        _a.label = 3;
                    case 3:
                        tri++;
                        return [3 /*break*/, 1];
                    case 4:
                        console.error('Error to listening, exiting');
                        return [2 /*return*/, false];
                }
            });
        });
    };
    OSCBOOP.prototype.save = function () {
        console.log(this.config, this.stats);
        return (0, fs_1.writeFileSync)(this.config.LOCAL_STATS_FILE, (function (e, o) {
            for (var _i = 0, _a = Object.keys(e); _i < _a.length; _i++) {
                var k = _a[_i];
                o[k] = e[k].local_count.toString();
            }
            return JSON.stringify(o);
        })(this.stats, {}), 'utf-8');
    };
    OSCBOOP.prototype.allPatameter = function () {
        return Object.keys(this.config.PARAMETER_NAMES);
    };
    OSCBOOP.prototype.parseParameter = function (name, type) {
        return config.PARAMETER_SCHEMATIC.replace('{TYPE}', this.config.PARAMETER_TYPES[type]).replace('{NAME}', this.config.PARAMETER_NAMES[name]);
    };
    ;
    OSCBOOP.prototype._ready = function () {
        var _this = this;
        this.server.on('message', function (msg) { return _this._onMessage(msg[0], msg[1]); });
        setInterval(function () { return _this.sendChatbox(); }, 1e4);
        setInterval(function () { return _this.save(); }, 36e4);
    };
    OSCBOOP.prototype._onMessage = function (parameter, value) {
        if (typeof value == 'boolean')
            for (var _i = 0, _a = this.allPatameter(); _i < _a.length; _i++) {
                var name_2 = _a[_i];
                if (parameter === this.parseParameter(name_2, "IN"))
                    this._onChangeValue(name_2, value);
            }
    };
    OSCBOOP.prototype._onChangeValue = function (name, value) {
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
    };
    OSCBOOP.prototype._addEvent = function (name) {
        this._waittingEvents.push({
            name: name,
            time: new Date()
        });
        if (!this.in_upload)
            this._uploadEvents();
    };
    Object.defineProperty(OSCBOOP.prototype, "in_upload", {
        get: function () {
            return this._in_upload;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OSCBOOP.prototype, "historyEvents", {
        get: function () {
            return this._historyEvents = this._historyEvents.filter(function (_a) {
                var time = _a.time;
                return time.getTime() > Date.now() - 6e4;
            });
        },
        enumerable: false,
        configurable: true
    });
    OSCBOOP.prototype._uploadEvents = function (nb_request, nb_uploaded_events) {
        if (nb_request === void 0) { nb_request = 0; }
        if (nb_uploaded_events === void 0) { nb_uploaded_events = 0; }
        return __awaiter(this, void 0, void 0, function () {
            var queue, body, response, error_1, _i, _a, name_3, stats, _loop_1, _b, _c, _d, name_4, type, _loop_2, _e, _f, _g, name_5, type;
            var _h;
            var _this = this;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        this._in_upload = true;
                        queue = this._waittingEvents;
                        this._waittingEvents = [];
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, (0, undici_1.request)(this.config.URL_SERVER + '/api/add', {
                                method: 'POST',
                                headers: {
                                    'Token': config.TOKEN_SERVER,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    data: queue,
                                    time: new Date()
                                })
                            })];
                    case 2:
                        response = _j.sent();
                        if (response.statusCode != 200)
                            throw '';
                        return [4 /*yield*/, response.body.json()];
                    case 3:
                        body = _j.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _j.sent();
                        body = {
                            data: queue.map(function (e) { return ({ name: e.name, type: "OFFLINE", time: e.time }); }),
                            counter: (function (parse) {
                                for (var _i = 0, _a = _this.allPatameter(); _i < _a.length; _i++) {
                                    var name_6 = _a[_i];
                                    parse[name_6] = _this.stats[name_6].local_count.toString();
                                }
                                return parse;
                            })({})
                        };
                        return [3 /*break*/, 5];
                    case 5:
                        ;
                        (_h = this._historyEvents).push.apply(_h, body.data);
                        for (_i = 0, _a = body.data.map(function (e) { return e.name; }); _i < _a.length; _i++) {
                            name_3 = _a[_i];
                            stats = this._stats[name_3];
                            stats.live_count = BigInt(body.counter[name_3]);
                        }
                        _loop_1 = function (name_4, type) {
                            return __generator(this, function (_k) {
                                switch (_k.label) {
                                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return _this.client.send(new node_osc_1.Message(_this.parseParameter(name_4, type), true), resolve); })];
                                    case 1:
                                        _k.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _b = 0, _c = body.data;
                        _j.label = 6;
                    case 6:
                        if (!(_b < _c.length)) return [3 /*break*/, 9];
                        _d = _c[_b], name_4 = _d.name, type = _d.type;
                        return [5 /*yield**/, _loop_1(name_4, type)];
                    case 7:
                        _j.sent();
                        _j.label = 8;
                    case 8:
                        _b++;
                        return [3 /*break*/, 6];
                    case 9: return [4 /*yield*/, sleep(200)];
                    case 10:
                        _j.sent();
                        _loop_2 = function (name_5, type) {
                            return __generator(this, function (_l) {
                                switch (_l.label) {
                                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return _this.client.send(new node_osc_1.Message(_this.parseParameter(name_5, type), false), resolve); })];
                                    case 1:
                                        _l.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _e = 0, _f = body.data;
                        _j.label = 11;
                    case 11:
                        if (!(_e < _f.length)) return [3 /*break*/, 14];
                        _g = _f[_e], name_5 = _g.name, type = _g.type;
                        return [5 /*yield**/, _loop_2(name_5, type)];
                    case 12:
                        _j.sent();
                        _j.label = 13;
                    case 13:
                        _e++;
                        return [3 /*break*/, 11];
                    case 14:
                        nb_request++;
                        nb_uploaded_events += body.data.length;
                        if (!(this._waittingEvents.length > 0)) return [3 /*break*/, 16];
                        return [4 /*yield*/, this._uploadEvents(nb_request, nb_uploaded_events)];
                    case 15: return [2 /*return*/, _j.sent()];
                    case 16: return [4 /*yield*/, this.sendChatbox()];
                    case 17:
                        _j.sent();
                        this._in_upload = false;
                        return [2 /*return*/, [nb_request, nb_uploaded_events]];
                }
            });
        });
    };
    OSCBOOP.prototype.parseDisplayname = function (name) {
        return this.config.PARAMETER_DISPLAY_NAMES[name] ? this.config.PARAMETER_DISPLAY_NAMES[name] : name;
    };
    OSCBOOP.prototype.sendChatbox = function () {
        return __awaiter(this, void 0, void 0, function () {
            var str;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.config.ENABLE_CHATBOX && (Date.now() - this._last_time_chatbox.getTime() > 1e3))) return [3 /*break*/, 2];
                        str = this.allPatameter()
                            .filter(function (name) { return _this.stats[name] && (Date.now() - _this.stats[name].last_update.getTime() < 1e4); })
                            .map(function (name) { return _this.parseDisplayname(name) + ": " + _this.stats[name].live_count; }).join('\n, ');
                        if (!(str.length > 3 && str != this._last_str_chatbox)) return [3 /*break*/, 2];
                        this._last_time_chatbox = new Date();
                        this._last_str_chatbox = str;
                        return [4 /*yield*/, new Promise(function (resolve) { return _this.client.send(new node_osc_1.Message('/chatbox/input', _this._last_str_chatbox, true), resolve); })];
                    case 1:
                        _a.sent();
                        console.log(this._last_time_chatbox, this._last_str_chatbox);
                        _a.label = 2;
                    case 2:
                        ;
                        return [2 /*return*/];
                }
            });
        });
    };
    return OSCBOOP;
}());
exports.OSCBOOP = OSCBOOP;
