var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options2) {
    this.name = name;
    this.startTime = options2?.startTime || _performanceNow();
    this.detail = options2?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options2) {
    const entry = new PerformanceMark(name, options2);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options2) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options2) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options2) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// api/viewer/_shared.ts
var SESSION_TTL_SECONDS = 60 * 60 * 8;
var SNAPSHOT_TTL_SECONDS = 60 * 60 * 8;
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type, authorization"
    }
  });
}
__name(json, "json");
function options() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "cache-control": "no-store"
    }
  });
}
__name(options, "options");
function cleanId(input) {
  return String(input || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}
__name(cleanId, "cleanId");
function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
__name(randomCode, "randomCode");
function sessionKey(sessionId) {
  return `viewer:${sessionId}`;
}
__name(sessionKey, "sessionKey");
function snapshotKey(sessionId) {
  return `viewer:${sessionId}:snapshot`;
}
__name(snapshotKey, "snapshotKey");
function joinUrl(request, sessionId) {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname.startsWith("/api/") ? "/" : url.pathname}#/viewer/${sessionId}`.replace(/\/api\/viewer\/session.*?#/, "/#");
}
__name(joinUrl, "joinUrl");
async function ensureStore(env2) {
  if (!env2?.DC_SYNC) throw new Error("DC_SYNC KV binding manquante pour le Viewer.");
  return env2.DC_SYNC;
}
__name(ensureStore, "ensureStore");

// api/viewer/session/[sessionId]/snapshot.ts
var onRequestOptions = /* @__PURE__ */ __name(async () => options(), "onRequestOptions");
var onRequestGet = /* @__PURE__ */ __name(async ({ params, env: env2 }) => {
  try {
    const sessionId = cleanId(params?.sessionId);
    if (!sessionId) return json({ ok: false, message: "Missing viewer session id" }, 400);
    const store = await ensureStore(env2);
    const raw = await store.get(snapshotKey(sessionId));
    if (!raw) return json({ ok: false, message: "Viewer snapshot not found" }, 404);
    return json({ ok: true, snapshot: JSON.parse(raw) });
  } catch (e) {
    return json({ ok: false, message: String(e?.message || e || "Viewer snapshot fetch failed") }, 500);
  }
}, "onRequestGet");
var onRequestPost = /* @__PURE__ */ __name(async ({ request, params, env: env2 }) => {
  try {
    const sessionId = cleanId(params?.sessionId);
    if (!sessionId) return json({ ok: false, message: "Missing viewer session id" }, 400);
    const store = await ensureStore(env2);
    const sessionRaw = await store.get(sessionKey(sessionId));
    if (!sessionRaw) return json({ ok: false, message: "Viewer session not found" }, 404);
    const meta = JSON.parse(sessionRaw || "{}");
    const payload = await request.json();
    if (!payload || typeof payload !== "object") return json({ ok: false, message: "Invalid viewer snapshot" }, 400);
    const next = {
      ...payload,
      v: 1,
      sessionId,
      updatedAt: Number(payload.updatedAt || Date.now()),
      players: Array.isArray(payload.players) ? payload.players : []
    };
    const rev = Number(meta?.rev || 0) + 1;
    await store.put(snapshotKey(sessionId), JSON.stringify(next), { expirationTtl: SNAPSHOT_TTL_SECONDS });
    await store.put(
      sessionKey(sessionId),
      JSON.stringify({ ...meta, sessionId, code: sessionId, status: "active", updatedAt: (/* @__PURE__ */ new Date()).toISOString(), rev }),
      { expirationTtl: SESSION_TTL_SECONDS }
    );
    return json({ ok: true, rev });
  } catch (e) {
    return json({ ok: false, message: String(e?.message || e || "Viewer snapshot publish failed") }, 500);
  }
}, "onRequestPost");

// api/running/routes/catalog.ts
var OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];
var CACHE_TTL_SECONDS = 6 * 60 * 60;
var STALE_TTL_SECONDS = 24 * 60 * 60;
var MAX_ROUTE_POINTS = 620;
var MAX_RETURNED_ROUTES = 72;
var MAX_OUTDOORACTIVE_IDS = 28;
function json2(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? `public, max-age=300, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_TTL_SECONDS}` : "no-store",
      "access-control-allow-origin": "*",
      "x-mss-route-catalog": "v3",
      ...headers
    }
  });
}
__name(json2, "json");
function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
__name(finite, "finite");
function canonicalSport(value) {
  const sport = String(value || "running").toLowerCase().trim();
  if (["running", "trail", "hiking", "walking", "nordic-walking", "cycling", "mtb", "gravel", "ebike", "bmx", "roller", "snowshoe", "ski-touring", "equestrian"].includes(sport)) return sport;
  return "running";
}
__name(canonicalSport, "canonicalSport");
function routeKindsForSport(sport) {
  if (sport === "running") return "running|fitness_trail|foot|hiking";
  if (sport === "trail") return "hiking|foot|running|fitness_trail";
  if (sport === "hiking") return "hiking|foot";
  if (sport === "walking") return "foot|hiking|running|fitness_trail";
  if (sport === "nordic-walking") return "nordic_walking|foot|hiking|fitness_trail";
  if (["cycling", "ebike", "gravel"].includes(sport)) return "bicycle|mtb";
  if (sport === "mtb") return "mtb|bicycle";
  if (sport === "bmx") return "bicycle|mtb";
  if (sport === "roller") return "inline_skates|foot";
  if (sport === "snowshoe") return "snowshoe|hiking|foot";
  if (sport === "ski-touring") return "ski|piste";
  if (sport === "equestrian") return "horse|hiking";
  return "hiking|foot|running|fitness_trail";
}
__name(routeKindsForSport, "routeKindsForSport");
function bboxAround(lat, lon, radiusKm) {
  const radius = Math.max(3, Math.min(80, radiusKm));
  const latDelta = radius / 111.32;
  const lonScale = Math.max(0.18, Math.cos(lat * Math.PI / 180));
  const lonDelta = radius / (111.32 * lonScale);
  return {
    south: Math.max(-85, lat - latDelta),
    west: Math.max(-180, lon - lonDelta),
    north: Math.min(85, lat + latDelta),
    east: Math.min(180, lon + lonDelta)
  };
}
__name(bboxAround, "bboxAround");
function overpassQuery(lat, lon, sport, radiusKm) {
  const bbox = bboxAround(lat, lon, radiusKm);
  const kinds = routeKindsForSport(sport);
  const box = `${bbox.south.toFixed(6)},${bbox.west.toFixed(6)},${bbox.north.toFixed(6)},${bbox.east.toFixed(6)}`;
  return `[out:json][timeout:18];
relation["type"="route"]["route"~"^(${kinds})$"](${box});
out geom;`;
}
__name(overpassQuery, "overpassQuery");
function haversineMeters(a, b) {
  const R = 6371e3;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
__name(haversineMeters, "haversineMeters");
function routeDistanceMeters(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineMeters(points[i - 1], points[i]);
  return total;
}
__name(routeDistanceMeters, "routeDistanceMeters");
function simplify(points) {
  if (points.length <= MAX_ROUTE_POINTS) return points;
  const step = Math.ceil(points.length / MAX_ROUTE_POINTS);
  const out = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}
__name(simplify, "simplify");
function geometryToPoints(geometry) {
  const now = Date.now();
  return simplify((Array.isArray(geometry) ? geometry : []).map((point, index) => ({ lat: Number(point?.lat), lon: Number(point?.lon), timestamp: now + index })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)));
}
__name(geometryToPoints, "geometryToPoints");
function connectedChains(relation) {
  const rawSegments = (Array.isArray(relation?.members) ? relation.members : []).filter((member) => member?.type === "way" && Array.isArray(member?.geometry) && member.geometry.length >= 2).map((member) => geometryToPoints(member.geometry)).filter((segment) => segment.length >= 2);
  const chains = [];
  for (const segment of rawSegments) {
    if (!chains.length) {
      chains.push([...segment]);
      continue;
    }
    let bestIndex = -1;
    let bestGap = Number.POSITIVE_INFINITY;
    let reverse = false;
    let prepend = false;
    for (let index = 0; index < chains.length; index += 1) {
      const chain = chains[index];
      const candidates = [
        { gap: haversineMeters(chain[chain.length - 1], segment[0]), reverse: false, prepend: false },
        { gap: haversineMeters(chain[chain.length - 1], segment[segment.length - 1]), reverse: true, prepend: false },
        { gap: haversineMeters(chain[0], segment[segment.length - 1]), reverse: false, prepend: true },
        { gap: haversineMeters(chain[0], segment[0]), reverse: true, prepend: true }
      ];
      candidates.sort((a, b) => a.gap - b.gap);
      if (candidates[0].gap < bestGap) {
        bestGap = candidates[0].gap;
        bestIndex = index;
        reverse = candidates[0].reverse;
        prepend = candidates[0].prepend;
      }
    }
    const oriented = reverse ? [...segment].reverse() : segment;
    if (bestIndex >= 0 && bestGap <= 550) {
      const chain = chains[bestIndex];
      chains[bestIndex] = prepend ? [...oriented.slice(0, -1), ...chain] : [...chain, ...oriented.slice(1)];
    } else chains.push([...segment]);
  }
  return chains.filter((chain) => chain.length >= 2).map(simplify).sort((a, b) => routeDistanceMeters(b) - routeDistanceMeters(a));
}
__name(connectedChains, "connectedChains");
function cleanText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 180) : fallback;
}
__name(cleanText, "cleanText");
function osmRelationToRoute(relation, sport) {
  const relationId = Number(relation?.id);
  if (!Number.isFinite(relationId)) return null;
  const route = connectedChains(relation)[0];
  if (!route || route.length < 2) return null;
  const distanceM = Math.round(routeDistanceMeters(route));
  if (!(distanceM >= 1e3)) return null;
  const tags = relation?.tags || {};
  const ref2 = cleanText(tags.ref);
  const name = cleanText(tags["name:fr"] || tags.name || ref2, `Parcours OSM ${relationId}`);
  const first = route[0];
  return {
    id: `osm:route:${relationId}`,
    externalId: `osm-relation:${relationId}`,
    name,
    route,
    distanceM,
    elevationGainM: 0,
    referenceElapsedMs: 0,
    createdAt: Date.now(),
    source: "osm",
    sport,
    network: cleanText(tags.network || tags["network:type"]) || void 0,
    routeRef: ref2 || void 0,
    operator: cleanText(tags.operator) || void 0,
    catalog: {
      provider: "openstreetmap",
      providerRouteId: String(relationId),
      sourceUrl: `https://www.openstreetmap.org/relation/${relationId}`,
      attribution: "\xA9 OpenStreetMap contributors",
      license: "ODbL",
      isLoop: route.length > 2 && haversineMeters(route[0], route[route.length - 1]) <= Math.max(120, distanceM * 0.04),
      cached: false
    }
  };
}
__name(osmRelationToRoute, "osmRelationToRoute");
function endpointSignal(parent, timeoutMs) {
  const controller = new AbortController();
  const abort2 = /* @__PURE__ */ __name(() => controller.abort(), "abort");
  if (parent.aborted) controller.abort();
  else parent.addEventListener("abort", abort2, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    dispose: /* @__PURE__ */ __name(() => {
      clearTimeout(timer);
      parent.removeEventListener("abort", abort2);
    }, "dispose")
  };
}
__name(endpointSignal, "endpointSignal");
async function fetchOverpass(query, signal) {
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const scoped = endpointSignal(signal, 6200);
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { accept: "application/json", "user-agent": "MULTISPORTS-SCORING-RouteCatalog/2.1" },
        signal: scoped.signal
      });
      if (!response.ok) throw new Error(`${endpoint}:${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data?.elements)) throw new Error(`${endpoint}:invalid-json`);
      return { data, endpoint };
    } finally {
      scoped.dispose();
    }
  });
  try {
    return await Promise.any(attempts);
  } catch (error3) {
    if (signal.aborted) throw error3;
    throw new Error(error3?.message || "overpass-unavailable");
  }
}
__name(fetchOverpass, "fetchOverpass");
function supabaseHeaders(key) {
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" };
}
__name(supabaseHeaders, "supabaseHeaders");
function normalizeStoredRow(raw, sport) {
  const row = raw?.value || raw;
  const points = (Array.isArray(row?.route) ? row.route : []).map((point, index) => ({
    lat: Number(point?.lat),
    lon: Number(point?.lon ?? point?.lng),
    timestamp: Number(point?.timestamp || Date.now() + index),
    altitude: Number.isFinite(Number(point?.altitude)) ? Number(point.altitude) : void 0
  })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  if (points.length < 2) return null;
  const provider = cleanText(row?.provider, "mss");
  const providerId = cleanText(row?.providerRouteId ?? row?.provider_route_id ?? row?.externalId ?? row?.external_id);
  if (!providerId) return null;
  const isOsm = provider === "openstreetmap";
  return {
    id: isOsm ? `osm:route:${providerId}` : `catalog:${provider}:${providerId}`,
    externalId: isOsm ? `osm-relation:${providerId}` : `${provider}:${providerId}`,
    name: cleanText(row?.title || row?.name, "Parcours r\xE9f\xE9renc\xE9"),
    route: simplify(points),
    distanceM: Math.round(finite(row?.distanceM ?? row?.distance_m, routeDistanceMeters(points))),
    elevationGainM: Math.round(finite(row?.elevationGainM ?? row?.elevation_gain_m, 0)),
    referenceElapsedMs: 0,
    createdAt: new Date(row?.updatedAt ?? row?.updated_at ?? row?.fetchedAt ?? row?.fetched_at ?? Date.now()).getTime(),
    source: provider === "openstreetmap" ? "osm" : "catalog",
    sport: cleanText(row?.sport, sport),
    network: cleanText(row?.network) || void 0,
    routeRef: cleanText(row?.routeRef ?? row?.route_ref) || void 0,
    operator: cleanText(row?.operator) || void 0,
    catalog: {
      provider,
      providerRouteId: providerId,
      sourceUrl: cleanText(row?.sourceUrl ?? row?.source_url) || void 0,
      imageUrl: cleanText(row?.imageUrl ?? row?.image_url) || void 0,
      attribution: cleanText(row?.attribution) || void 0,
      license: cleanText(row?.license ?? row?.sourceLicense ?? row?.source_license) || void 0,
      ranking: finite(row?.ranking, 0) || void 0,
      difficulty: finite(row?.difficulty, 0) || void 0,
      isLoop: typeof (row?.isLoop ?? row?.is_loop) === "boolean" ? Boolean(row?.isLoop ?? row?.is_loop) : void 0,
      cached: true,
      countryCode: cleanText(row?.countryCode ?? row?.country_code) || void 0,
      regionName: cleanText(row?.regionName ?? row?.region_name) || void 0,
      locality: cleanText(row?.locality) || void 0
    }
  };
}
__name(normalizeStoredRow, "normalizeStoredRow");
async function searchPersistentCatalog(env2, lat, lon, sport, radiusKm, targetKm, signal) {
  if (!env2.SUPABASE_URL || !env2.SUPABASE_ANON_KEY) return [];
  const targetM = targetKm > 0 ? targetKm * 1e3 : 0;
  const body = {
    p_latitude: lat,
    p_longitude: lon,
    p_radius_km: Math.max(1, Math.min(100, radiusKm)),
    p_sport: sport,
    p_min_distance_m: targetM > 0 ? Math.round(targetM * 0.5) : 0,
    p_max_distance_m: targetM > 0 ? Math.round(targetM * 1.5) : 1e6,
    p_limit: 60
  };
  try {
    const response = await fetch(`${env2.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/ms_search_running_route_catalog`, {
      method: "POST",
      headers: supabaseHeaders(env2.SUPABASE_ANON_KEY),
      body: JSON.stringify(body),
      signal
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (Array.isArray(payload) ? payload : []).map((row) => normalizeStoredRow(row, sport)).filter(Boolean);
  } catch {
    return [];
  }
}
__name(searchPersistentCatalog, "searchPersistentCatalog");
function toPersistRow(route) {
  if (!route.catalog || route.catalog.provider !== "openstreetmap") return null;
  const first = route.route[0];
  if (!first) return null;
  return {
    provider: route.catalog.provider,
    provider_route_id: route.catalog.providerRouteId,
    title: route.name,
    sport: route.sport,
    route: route.route,
    distance_m: Math.round(route.distanceM),
    elevation_gain_m: Math.round(route.elevationGainM || 0),
    center_lat: first.lat,
    center_lon: first.lon,
    network: route.network || null,
    route_ref: route.routeRef || null,
    operator: route.operator || null,
    source_url: route.catalog.sourceUrl || null,
    image_url: route.catalog.imageUrl || null,
    attribution: route.catalog.attribution || "\xA9 OpenStreetMap contributors",
    source_license: route.catalog.license || "ODbL",
    ranking: route.catalog.ranking || 0,
    difficulty: route.catalog.difficulty || 0,
    is_loop: Boolean(route.catalog.isLoop),
    country_code: null,
    region_name: null,
    locality: null,
    metadata: { source: "live-osm", importedBy: "mss-route-catalog-v2" },
    fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(toPersistRow, "toPersistRow");
async function persistRoutes(env2, routes2) {
  if (!env2.SUPABASE_URL || !env2.SUPABASE_SERVICE_ROLE_KEY) return;
  const rows = routes2.map(toPersistRow).filter(Boolean);
  if (!rows.length) return;
  try {
    await fetch(`${env2.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/ms_running_route_catalog?on_conflict=provider,provider_route_id,sport`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(env2.SUPABASE_SERVICE_ROLE_KEY),
        prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(rows.slice(0, 64))
    });
  } catch {
  }
}
__name(persistRoutes, "persistRoutes");
function extractIds(payload) {
  const direct = payload?.data?.ids ?? payload?.ids ?? payload?.result?.ids;
  if (Array.isArray(direct)) return direct.map(String).filter(Boolean);
  const found = [];
  const visit = /* @__PURE__ */ __name((value, depth = 0) => {
    if (!value || depth > 5) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value.ids)) value.ids.forEach((id) => found.push(String(id)));
    Object.values(value).forEach((child) => visit(child, depth + 1));
  }, "visit");
  visit(payload);
  return [...new Set(found.filter(Boolean))];
}
__name(extractIds, "extractIds");
function extractTours(payload) {
  const candidates = [];
  const visit = /* @__PURE__ */ __name((value, depth = 0) => {
    if (!value || depth > 6) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    const geometry = value.geometry ?? value.geom ?? value.lineString;
    const id = value.id ?? value["@id"];
    if (id != null && geometry != null && (value.length != null || value.category != null || value.title != null)) candidates.push(value);
    Object.entries(value).forEach(([key, child]) => {
      if (key !== "geometry" && key !== "images") visit(child, depth + 1);
    });
  }, "visit");
  visit(payload);
  const seen = /* @__PURE__ */ new Set();
  return candidates.filter((item) => {
    const id = String(item.id ?? item["@id"] ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
__name(extractTours, "extractTours");
function scalar(value) {
  if (value == null) return void 0;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return scalar(value[0]);
  if (typeof value === "object") return value.value ?? value.text ?? value["#text"] ?? value._ ?? value.name ?? void 0;
  return void 0;
}
__name(scalar, "scalar");
function parseOutdooractiveGeometry(value) {
  const raw = cleanText(scalar(value), "").replace(/^LINESTRING\s*\(/i, "").replace(/\)$/, "");
  if (!raw) return [];
  const now = Date.now();
  const points = raw.split(/\s+/).map((pair, index) => {
    const pieces = pair.split(",");
    if (pieces.length < 2) return null;
    const lon = Number(pieces[0]);
    const lat = Number(pieces[1]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, timestamp: now + index } : null;
  }).filter(Boolean);
  return simplify(points);
}
__name(parseOutdooractiveGeometry, "parseOutdooractiveGeometry");
function outdooractiveSportAffinity(category, title2, sport) {
  const haystack = `${category} ${title2}`.toLowerCase();
  if (sport === "nordic-walking") return /(nordic|nordique|nordisch)/i.test(haystack) ? 4 : /(walk|marche|hiking|wander|randonn|sender)/i.test(haystack) ? 2 : 0;
  if (sport === "trail") return /(trail|mountain|berg|hiking|wander|randonn|sender|trek)/i.test(haystack) ? 3 : /(running|lauf|course)/i.test(haystack) ? 2 : 0;
  if (sport === "hiking") return /(hiking|wander|randonn|sender|walk|trek)/i.test(haystack) ? 3 : 0;
  if (sport === "walking") return /(walk|marche|promenade|hiking|wander|randonn|spazier)/i.test(haystack) ? 3 : 0;
  if (sport === "running") return /(running|jog|lauf|course|trail)/i.test(haystack) ? 3 : /(fitness)/i.test(haystack) ? 2 : 1;
  if (sport === "mtb") return /(mtb|mountain bike|vtt)/i.test(haystack) ? 4 : /(bike|cycling|velo|vélo)/i.test(haystack) ? 2 : 0;
  if (["cycling", "gravel", "ebike"].includes(sport)) return /(bike|cycling|velo|vélo|gravel|e-bike|ebike|vtt)/i.test(haystack) ? 3 : 0;
  if (sport === "snowshoe") return /(snowshoe|raquette)/i.test(haystack) ? 4 : 0;
  if (sport === "ski-touring") return /(ski touring|ski de randonnée|skitour)/i.test(haystack) ? 4 : 0;
  if (sport === "equestrian") return /(horse|equestrian|cheval|reit)/i.test(haystack) ? 4 : 0;
  return 1;
}
__name(outdooractiveSportAffinity, "outdooractiveSportAffinity");
function outdooractiveTourToRoute(tour, sport) {
  const id = String(tour?.id ?? tour?.["@id"] ?? "");
  if (!id) return null;
  const route = parseOutdooractiveGeometry(tour?.geometry);
  if (route.length < 2) return null;
  const title2 = cleanText(scalar(tour?.title), `Outdooractive ${id}`);
  const categoryName = cleanText(scalar(tour?.category?.name ?? tour?.category), "");
  if (outdooractiveSportAffinity(categoryName, title2, sport) <= 0) return null;
  const distanceM = finite(scalar(tour?.length), routeDistanceMeters(route));
  const elevation = tour?.elevation || {};
  const ascent = finite(elevation?.ascent ?? elevation?.["@ascent"], 0);
  const ranking = finite(tour?.ranking ?? tour?.["@ranking"], 0);
  const rating = tour?.rating || {};
  const difficulty = finite(rating?.difficulty ?? rating?.["@difficulty"], 0);
  const properties = Array.isArray(tour?.properties?.property) ? tour.properties.property : Array.isArray(tour?.properties) ? tour.properties : [];
  const loop = properties.some((property) => /loop/i.test(String(property?.tag || property?.name || property?.text || ""))) || haversineMeters(route[0], route[route.length - 1]) <= Math.max(120, distanceM * 0.04);
  const imageId = String(tour?.primaryImage?.id ?? tour?.primaryImage?.["@id"] ?? "");
  const sourceName = cleanText(tour?.meta?.source?.name ?? tour?.meta?.source?.["@name"], "Outdooractive");
  const author = cleanText(scalar(tour?.meta?.author), "");
  return {
    id: `catalog:outdooractive:${id}`,
    externalId: `outdooractive:${id}`,
    name: title2,
    route,
    distanceM: Math.round(distanceM),
    elevationGainM: Math.round(ascent),
    referenceElapsedMs: 0,
    createdAt: Date.now(),
    source: "catalog",
    sport,
    catalog: {
      provider: "outdooractive",
      providerRouteId: id,
      sourceUrl: "https://www.outdooractive.com/",
      imageUrl: imageId ? `https://img.oastatic.com/img2/${imageId}/420x237r/variant.jpg` : void 0,
      attribution: [sourceName, author].filter(Boolean).join(" \xB7 ") || "Outdooractive",
      license: "Outdooractive API terms",
      ranking: ranking || void 0,
      difficulty: difficulty || void 0,
      isLoop: loop,
      cached: false
    }
  };
}
__name(outdooractiveTourToRoute, "outdooractiveTourToRoute");
async function fetchOutdooractive(env2, lat, lon, sport, radiusKm, targetKm, signal) {
  if (!env2.OUTDOORACTIVE_API_KEY || !env2.OUTDOORACTIVE_PROJECT_KEY) return [];
  const project = encodeURIComponent(env2.OUTDOORACTIVE_PROJECT_KEY);
  const key = encodeURIComponent(env2.OUTDOORACTIVE_API_KEY);
  const targetM = targetKm > 0 ? targetKm * 1e3 : 0;
  const params = new URLSearchParams({
    location: `${lon},${lat}`,
    radius: String(Math.round(Math.min(80, Math.max(3, radiusKm)) * 1e3)),
    sortby: "distance",
    limit: String(MAX_OUTDOORACTIVE_IDS),
    key: env2.OUTDOORACTIVE_API_KEY,
    lang: "fr"
  });
  if (targetM > 0) {
    params.set("len_s", String(Math.max(500, Math.round(targetM * 0.5))));
    params.set("len_e", String(Math.round(targetM * 1.5)));
  }
  const nearbyUrl = `https://www.outdooractive.com/api/project/${project}/nearby/tour?${params.toString()}`;
  const nearby = await fetch(nearbyUrl, { headers: { accept: "application/json" }, signal });
  if (!nearby.ok) throw new Error(`outdooractive-nearby:${nearby.status}`);
  const ids = extractIds(await nearby.json()).slice(0, MAX_OUTDOORACTIVE_IDS);
  if (!ids.length) return [];
  const detailsUrl = `https://www.outdooractive.com/api/project/${project}/oois/${ids.map(encodeURIComponent).join(",")}?key=${key}&lang=fr&fallback=true`;
  const details = await fetch(detailsUrl, { headers: { accept: "application/json" }, signal });
  if (!details.ok) throw new Error(`outdooractive-details:${details.status}`);
  return extractTours(await details.json()).map((tour) => outdooractiveTourToRoute(tour, sport)).filter(Boolean);
}
__name(fetchOutdooractive, "fetchOutdooractive");
function routeStartDistance(route, lat, lon) {
  const first = route.route[0];
  return first ? haversineMeters(first, { lat, lon }) : Number.POSITIVE_INFINITY;
}
__name(routeStartDistance, "routeStartDistance");
function targetDistanceScore(route, targetKm) {
  if (!(targetKm > 0)) return 0;
  const targetM = targetKm * 1e3;
  const ratio = Math.abs(route.distanceM - targetM) / Math.max(500, targetM);
  if (ratio <= 0.1) return 40;
  if (ratio <= 0.2) return 28;
  if (ratio <= 0.35) return 14;
  if (ratio <= 0.5) return 2;
  return -30;
}
__name(targetDistanceScore, "targetDistanceScore");
function providerScore(route) {
  const provider = route.catalog?.provider || "";
  if (provider === "outdooractive") return 18 + Math.min(10, Number(route.catalog?.ranking || 0) / 10);
  if (provider === "openstreetmap") return 14;
  if (provider === "gpx-import") return 16;
  return 12;
}
__name(providerScore, "providerScore");
function minimumRouteDistanceM(sport) {
  if (sport === "walking") return 1e3;
  if (sport === "nordic-walking" || sport === "running") return 1500;
  if (sport === "trail" || sport === "hiking") return 2500;
  return 1e3;
}
__name(minimumRouteDistanceM, "minimumRouteDistanceM");
function dedupeAndRank(routes2, lat, lon, targetKm, sport) {
  const exact = /* @__PURE__ */ new Map();
  const minDistanceM = minimumRouteDistanceM(sport);
  for (const route of routes2) {
    if (!route?.route?.length || route.distanceM < minDistanceM) continue;
    const key = route.externalId || route.id;
    const existing = exact.get(key);
    if (!existing || route.route.length > existing.route.length) exact.set(key, route);
  }
  const sorted = [...exact.values()].sort((a, b) => {
    const aScore = providerScore(a) + targetDistanceScore(a, targetKm) - Math.min(25, routeStartDistance(a, lat, lon) / 2500);
    const bScore = providerScore(b) + targetDistanceScore(b, targetKm) - Math.min(25, routeStartDistance(b, lat, lon) / 2500);
    return bScore - aScore || Math.abs(a.distanceM - targetKm * 1e3) - Math.abs(b.distanceM - targetKm * 1e3);
  });
  const output = [];
  for (const candidate of sorted) {
    const duplicate = output.some((existing) => {
      const nameA = existing.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const nameB = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const distanceRatio = Math.abs(existing.distanceM - candidate.distanceM) / Math.max(1e3, existing.distanceM);
      const startGap = haversineMeters(existing.route[0], candidate.route[0]);
      return nameA && nameB && nameA === nameB && distanceRatio < 0.12 || distanceRatio < 0.05 && startGap < 180;
    });
    if (!duplicate) output.push(candidate);
    if (output.length >= MAX_RETURNED_ROUTES) break;
  }
  return output;
}
__name(dedupeAndRank, "dedupeAndRank");
function cacheRequestUrl(request, lat, lon, sport, radiusKm, targetKm) {
  const u = new URL(request.url);
  u.search = "";
  u.searchParams.set("lat", (Math.round(lat * 500) / 500).toFixed(3));
  u.searchParams.set("lon", (Math.round(lon * 500) / 500).toFixed(3));
  u.searchParams.set("sport", sport);
  u.searchParams.set("radiusKm", String(Math.round(radiusKm)));
  u.searchParams.set("targetKm", targetKm > 0 ? targetKm.toFixed(1) : "0");
  u.searchParams.set("v", "4");
  return new Request(u.toString(), { method: "GET" });
}
__name(cacheRequestUrl, "cacheRequestUrl");
async function settleWithin(promise, timeoutMs, fallback) {
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
__name(settleWithin, "settleWithin");
var onRequestOptions2 = /* @__PURE__ */ __name(async () => new Response(null, {
  status: 204,
  headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type"
  }
}), "onRequestOptions");
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, waitUntil, env: env2 }) => {
  const url = new URL(request.url);
  const lat = finite(url.searchParams.get("lat"), NaN);
  const lon = finite(url.searchParams.get("lon"), NaN);
  const sport = canonicalSport(url.searchParams.get("sport"));
  const radiusKm = Math.max(3, Math.min(80, Math.round(finite(url.searchParams.get("radiusKm"), 15))));
  const targetKm = Math.max(0, Math.min(100, finite(url.searchParams.get("targetKm"), 0)));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -85 || lat > 85 || lon < -180 || lon > 180) {
    return json2({ ok: false, error: "invalid_position" }, 400);
  }
  const cacheKey = cacheRequestUrl(request, lat, lon, sport, radiusKm, targetKm);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("x-mss-route-catalog-cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 11500);
  const startedAt = Date.now();
  const warnings = [];
  let osmElements = [];
  let osmUpstream = "";
  try {
    const storedPromise = searchPersistentCatalog(env2, lat, lon, sport, radiusKm, targetKm, controller.signal);
    const osmPromise = fetchOverpass(overpassQuery(lat, lon, sport, radiusKm), controller.signal).then(({ data, endpoint }) => {
      osmElements = Array.isArray(data?.elements) ? data.elements : [];
      osmUpstream = endpoint;
      return osmElements.filter((element) => element?.type === "relation").map((relation) => osmRelationToRoute(relation, sport)).filter(Boolean);
    }).catch((error3) => {
      warnings.push(`osm:${String(error3?.message || error3)}`);
      return [];
    });
    const outdooractivePromise = fetchOutdooractive(env2, lat, lon, sport, radiusKm, targetKm, controller.signal).catch((error3) => {
      warnings.push(`outdooractive:${String(error3?.message || error3)}`);
      return [];
    });
    const stored = await settleWithin(storedPromise, 1800, []);
    const remoteBudget = stored.length >= 18 ? 1200 : 6500;
    const [osmRoutes, outdooractiveRoutes] = await Promise.all([
      settleWithin(osmPromise, remoteBudget, []),
      settleWithin(outdooractivePromise, stored.length >= 18 ? 900 : 5e3, [])
    ]);
    const routes2 = dedupeAndRank([...stored, ...osmRoutes, ...outdooractiveRoutes], lat, lon, targetKm, sport);
    if (osmRoutes.length) waitUntil(persistRoutes(env2, osmRoutes));
    const providerCounts = routes2.reduce((acc, route) => {
      const provider = route.catalog?.provider || (route.source === "osm" ? "openstreetmap" : "mss");
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {});
    const response = json2({
      ok: true,
      provider: "mss-global-route-catalog-v4",
      sport,
      radiusKm,
      targetKm,
      center: { lat, lon },
      fetchedAt: Date.now(),
      routes: routes2,
      // Kept for V117/backward compatibility. New clients consume `routes` first.
      elements: osmElements,
      upstream: osmUpstream || null,
      providers: providerCounts,
      warnings,
      persistentCatalog: Boolean(env2.SUPABASE_URL && env2.SUPABASE_ANON_KEY),
      outdooractiveEnabled: Boolean(env2.OUTDOORACTIVE_API_KEY && env2.OUTDOORACTIVE_PROJECT_KEY),
      elapsedMs: Date.now() - startedAt
    }, 200, { "x-mss-route-catalog-cache": "MISS" });
    if (routes2.length) waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error3) {
    const reason = error3?.name === "AbortError" ? "timeout" : String(error3?.message || error3 || "unavailable");
    return json2({ ok: false, error: "route_catalog_unavailable", reason, warnings }, 503);
  } finally {
    clearTimeout(timer);
  }
}, "onRequestGet");

// api/viewer/session/[sessionId].ts
var onRequestOptions3 = /* @__PURE__ */ __name(async () => options(), "onRequestOptions");
var onRequestDelete = /* @__PURE__ */ __name(async ({ params, env: env2 }) => {
  try {
    const sessionId = cleanId(params?.sessionId);
    if (!sessionId) return json({ ok: false, message: "Missing viewer session id" }, 400);
    const store = await ensureStore(env2);
    await store.put(sessionKey(sessionId), JSON.stringify({ sessionId, status: "closed", closedAt: (/* @__PURE__ */ new Date()).toISOString() }), { expirationTtl: 60 * 10 });
    await store.put(
      snapshotKey(sessionId),
      JSON.stringify({
        v: 1,
        sessionId,
        updatedAt: Date.now(),
        sport: "darts",
        game: "unknown",
        phase: "closed",
        title: "Session viewer ferm\xE9e",
        screen: "closed",
        activePlayerId: null,
        players: [],
        meta: { text: "Session ferm\xE9e" },
        source: "viewer"
      }),
      { expirationTtl: SNAPSHOT_TTL_SECONDS }
    );
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, message: String(e?.message || e || "Viewer session close failed") }, 500);
  }
}, "onRequestDelete");

// api/storage/backups/[[path]].ts
var R2_BACKUP_RETENTION_TOTAL = 2;
function json3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-multisports-storage-route": "cloudflare-pages-r2-direct"
    }
  });
}
__name(json3, "json");
function b64urlToBytes(input) {
  const raw = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
__name(b64urlToBytes, "b64urlToBytes");
function decodeJwtPart(input) {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(input)));
  } catch {
    return null;
  }
}
__name(decodeJwtPart, "decodeJwtPart");
function unverifiedJwtPayload(token) {
  const parts = String(token || "").split(".");
  return parts.length === 3 ? decodeJwtPart(parts[1]) : null;
}
__name(unverifiedJwtPayload, "unverifiedJwtPayload");
function looksLikeSupabaseJwt(token) {
  const payload = unverifiedJwtPayload(token);
  const issuer = String(payload?.iss || "").toLowerCase();
  return !!payload?.sub && (issuer.includes("supabase.co/auth/v1") || String(payload?.role || "") === "authenticated");
}
__name(looksLikeSupabaseJwt, "looksLikeSupabaseJwt");
async function verifyHs256Jwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3 || !secret) return null;
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (!header || header.alg !== "HS256" || !payload?.sub) return null;
  if (payload.exp && Number(payload.exp) * 1e3 < Date.now()) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  return ok ? payload : null;
}
__name(verifyHs256Jwt, "verifyHs256Jwt");
function authConfigStatus(env2) {
  return {
    supabaseAuthConfigured: !!(String(env2.SUPABASE_URL || "").trim() && String(env2.SUPABASE_ANON_KEY || "").trim()),
    nasJwtConfigured: !!String(env2.JWT_SECRET || "").trim(),
    acceptedAuthModes: [
      ...String(env2.SUPABASE_URL || "").trim() && String(env2.SUPABASE_ANON_KEY || "").trim() ? ["supabase"] : [],
      ...String(env2.JWT_SECRET || "").trim() ? ["nas-jwt"] : []
    ]
  };
}
__name(authConfigStatus, "authConfigStatus");
async function resolveIdentity(request, env2) {
  const raw = request.headers.get("authorization") || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
  if (!token) throw Object.assign(new Error("Session requise."), { status: 401, code: "session_required" });
  const tokenLooksSupabase = looksLikeSupabaseJwt(token);
  const jwtSecret = String(env2.JWT_SECRET || "").trim();
  if (!tokenLooksSupabase) {
    if (!jwtSecret) {
      throw Object.assign(new Error("JWT_SECRET absent dans Cloudflare Pages."), {
        status: 503,
        code: "nas_jwt_secret_missing"
      });
    }
    const payload = await verifyHs256Jwt(token, jwtSecret);
    if (payload?.sub) {
      return {
        userId: String(payload.sub),
        email: String(payload.email || "").trim().toLowerCase(),
        authMode: "nas-jwt"
      };
    }
  }
  const supabaseUrl = String(env2.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(env2.SUPABASE_ANON_KEY || "");
  if (supabaseUrl && anonKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4e3);
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, authorization: `Bearer ${token}` },
        signal: controller.signal
      }).finally(() => clearTimeout(timer));
      const user = response.ok ? await response.json() : null;
      if (user?.id) {
        const meta = user.user_metadata || {};
        const userId = String(meta.canonical_user_id || meta.nas_user_id || meta.multisports_user_id || user.id).trim();
        return {
          userId,
          email: String(user.email || "").trim().toLowerCase(),
          authMode: "supabase"
        };
      }
    } catch {
    }
  } else if (tokenLooksSupabase) {
    throw Object.assign(new Error("Supabase Auth n'est pas configur\xE9 dans Cloudflare Pages."), {
      status: 503,
      code: "supabase_auth_not_configured"
    });
  }
  if (jwtSecret) {
    const payload = await verifyHs256Jwt(token, jwtSecret);
    if (payload?.sub) {
      return {
        userId: String(payload.sub),
        email: String(payload.email || "").trim().toLowerCase(),
        authMode: "nas-jwt"
      };
    }
  }
  throw Object.assign(new Error("Session invalide."), { status: 401, code: "invalid_session" });
}
__name(resolveIdentity, "resolveIdentity");
function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);
}
__name(safeId, "safeId");
function manifestKey(userId) {
  return `users/${safeId(userId)}/backups/manifest-v1.json`;
}
__name(manifestKey, "manifestKey");
function backupKey(userId, id) {
  return `users/${safeId(userId)}/backups/${safeId(id)}.json`;
}
__name(backupKey, "backupKey");
function avatarFallbackKey(userId, profileId) {
  return `users/${safeId(userId)}/avatars/${safeId(profileId)}.json`;
}
__name(avatarFallbackKey, "avatarFallbackKey");
function mediaFallbackKey(userId, mediaKey) {
  return `users/${safeId(userId)}/media-fallback/${safeId(mediaKey)}.json`;
}
__name(mediaFallbackKey, "mediaFallbackKey");
function mediaFallbackManifestKey(userId) {
  return `users/${safeId(userId)}/media-fallback/manifest-v2.json`;
}
__name(mediaFallbackManifestKey, "mediaFallbackManifestKey");
function nasUserMirrorKey(userId) {
  return `users/${safeId(userId)}/nas-mirror/user-v1.json`;
}
__name(nasUserMirrorKey, "nasUserMirrorKey");
function entitlementKey(userId) {
  return `users/${safeId(userId)}/billing/storage-entitlement-v1.json`;
}
__name(entitlementKey, "entitlementKey");
async function readMediaMirrorManifest(bucket, userId) {
  const object = await bucket.get(mediaFallbackManifestKey(userId));
  if (!object) return { version: 2, userId, updatedAt: (/* @__PURE__ */ new Date(0)).toISOString(), media: {} };
  try {
    const parsed = JSON.parse(await object.text());
    return {
      version: 2,
      userId,
      updatedAt: String(parsed?.updatedAt || ""),
      media: parsed?.media && typeof parsed.media === "object" ? parsed.media : {}
    };
  } catch {
    return { version: 2, userId, updatedAt: (/* @__PURE__ */ new Date(0)).toISOString(), media: {} };
  }
}
__name(readMediaMirrorManifest, "readMediaMirrorManifest");
async function writeMediaMirrorManifest(bucket, manifest) {
  manifest.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await bucket.put(mediaFallbackManifestKey(manifest.userId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" }
  });
}
__name(writeMediaMirrorManifest, "writeMediaMirrorManifest");
async function readStorageEntitlement(bucket, userId) {
  const object = await bucket.get(entitlementKey(userId));
  if (!object) return null;
  try {
    const parsed = JSON.parse(await object.text());
    const quotaBytes = Number(parsed?.quotaBytes || 0);
    if (!parsed || !Number.isFinite(quotaBytes) || quotaBytes <= 0) return null;
    return {
      version: 1,
      userId: String(parsed.userId || userId),
      planId: String(parsed.planId || "free_test_100mb"),
      quotaBytes,
      baseUsedBytes: Math.max(0, Number(parsed?.baseUsedBytes || 0)),
      billingStatus: String(parsed.billingStatus || "free"),
      billingExempt: parsed.billingExempt === true,
      storageProvider: String(parsed.storageProvider || "cloud_r2"),
      updatedAt: String(parsed.updatedAt || ""),
      currentPeriodEnd: parsed.currentPeriodEnd == null ? null : String(parsed.currentPeriodEnd)
    };
  } catch {
    return null;
  }
}
__name(readStorageEntitlement, "readStorageEntitlement");
function isEntitlementActive(entitlement) {
  if (!entitlement) return false;
  if (entitlement.billingExempt) return true;
  return ["active", "trialing"].includes(String(entitlement.billingStatus || "").toLowerCase());
}
__name(isEntitlementActive, "isEntitlementActive");
async function resolveStoragePlan(bucket, identity, env2) {
  const entitlement = await readStorageEntitlement(bucket, identity.userId);
  if (isEntitlementActive(entitlement)) {
    return {
      planId: entitlement.planId,
      quotaBytes: entitlement.billingExempt ? Number.MAX_SAFE_INTEGER : entitlement.quotaBytes,
      billingStatus: entitlement.billingStatus,
      baseUsedBytes: Math.max(0, Number(entitlement.baseUsedBytes || 0)),
      billingExempt: entitlement.billingExempt,
      source: "entitlement"
    };
  }
  return {
    planId: "free_test_100mb",
    quotaBytes: 0,
    billingStatus: "locked",
    baseUsedBytes: 0,
    billingExempt: false,
    source: "fallback_free"
  };
}
__name(resolveStoragePlan, "resolveStoragePlan");
var MB = 1024 * 1024;
var GB = 1024 * MB;
var TB = 1024 * GB;
var STORAGE_BILLING_PLANS = {
  starter_500mb: { id: "starter_500mb", label: "Starter 500 Mo", quotaBytes: 500 * MB, monthlyEnv: "STRIPE_PRICE_STORAGE_STARTER_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_STARTER_YEARLY" },
  player_5gb: { id: "player_5gb", label: "Player 5 Go", quotaBytes: 5 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PLAYER_YEARLY" },
  plus_25gb: { id: "plus_25gb", label: "Plus 25 Go", quotaBytes: 25 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_PLUS_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PLUS_YEARLY" },
  pro_100gb: { id: "pro_100gb", label: "Pro 100 Go", quotaBytes: 100 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_PRO_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_PRO_YEARLY" },
  club_500gb: { id: "club_500gb", label: "Club 500 Go", quotaBytes: 500 * GB, monthlyEnv: "STRIPE_PRICE_STORAGE_CLUB_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_CLUB_YEARLY" },
  titan_2tb: { id: "titan_2tb", label: "Titan 2 To", quotaBytes: 2 * TB, monthlyEnv: "STRIPE_PRICE_STORAGE_TITAN_MONTHLY", yearlyEnv: "STRIPE_PRICE_STORAGE_TITAN_YEARLY" }
};
var PAID_STORAGE_PLAN_IDS = new Set(Object.keys(STORAGE_BILLING_PLANS));
function canWritePaidR2(plan) {
  return PAID_STORAGE_PLAN_IDS.has(String(plan?.planId || "")) && ["active", "trialing"].includes(String(plan?.billingStatus || "").toLowerCase());
}
__name(canWritePaidR2, "canWritePaidR2");
async function writeStorageEntitlement(bucket, args) {
  const plan = STORAGE_BILLING_PLANS[String(args.planId || "")];
  if (!plan && !args.billingExempt) throw new Error("Plan stockage inconnu.");
  const entitlement = {
    version: 1,
    userId: args.userId,
    planId: args.billingExempt ? "founder_nas" : plan.id,
    quotaBytes: args.billingExempt ? Number.MAX_SAFE_INTEGER : plan.quotaBytes,
    baseUsedBytes: 0,
    billingStatus: String(args.billingStatus || "locked"),
    billingExempt: args.billingExempt === true,
    storageProvider: "cloud_r2",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    currentPeriodEnd: args.currentPeriodEnd || null
  };
  await bucket.put(entitlementKey(args.userId), JSON.stringify(entitlement), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { userId: args.userId, planId: entitlement.planId, billingStatus: entitlement.billingStatus }
  });
  return entitlement;
}
__name(writeStorageEntitlement, "writeStorageEntitlement");
async function stripeRequest(env2, pathname, init) {
  const secret = String(env2.STRIPE_SECRET_KEY || "").trim();
  if (!secret) throw Object.assign(new Error("STRIPE_SECRET_KEY absent dans Cloudflare Pages."), { status: 503, code: "stripe_secret_missing" });
  const response = await fetch(`https://api.stripe.com${pathname}`, {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      ...init?.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}
    },
    body: init?.form || void 0
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
  }
  if (!response.ok) {
    const err = new Error(String(data?.error?.message || text || `Stripe HTTP ${response.status}`));
    err.status = 502;
    err.code = String(data?.error?.code || "stripe_request_failed");
    throw err;
  }
  return data;
}
__name(stripeRequest, "stripeRequest");
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualHex, "timingSafeEqualHex");
async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256Hex, "hmacSha256Hex");
async function verifyStripeWebhook(rawBody, header, env2) {
  const secret = String(env2.STRIPE_WEBHOOK_SECRET_STORAGE || env2.STRIPE_STORAGE_WEBHOOK_SECRET || "").trim();
  if (!secret || !header) return false;
  const fields = header.split(",").map((v) => v.trim());
  const timestamp = fields.find((v) => v.startsWith("t="))?.slice(2) || "";
  const signatures = fields.filter((v) => v.startsWith("v1=")).map((v) => v.slice(3));
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Date.now() / 1e3 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((sig) => timingSafeEqualHex(expected, sig));
}
__name(verifyStripeWebhook, "verifyStripeWebhook");
async function activateEntitlementFromStripeSession(bucket, session, env2, expectedUserId) {
  const metadata = session?.metadata || {};
  const userId = String(metadata.userId || metadata.user_id || session?.client_reference_id || "").trim();
  const planId = String(metadata.planId || metadata.plan_id || "").trim();
  if (!userId || !STORAGE_BILLING_PLANS[planId]) throw Object.assign(new Error("Session Stripe sans utilisateur/plan stockage valide."), { status: 400, code: "stripe_session_metadata_invalid" });
  if (expectedUserId && userId !== expectedUserId) throw Object.assign(new Error("Cette session Stripe n'appartient pas au compte connect\xE9."), { status: 403, code: "stripe_session_user_mismatch" });
  let subscription = null;
  const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id;
  if (subscriptionId) subscription = await stripeRequest(env2, `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const billingStatus = String(subscription?.status || (session?.payment_status === "paid" ? "active" : "pending"));
  if (!["active", "trialing"].includes(billingStatus)) throw Object.assign(new Error(`Abonnement Stripe non actif (${billingStatus}).`), { status: 402, code: "premium_not_active" });
  const periodEnd = subscription?.current_period_end ? new Date(Number(subscription.current_period_end) * 1e3).toISOString() : null;
  const entitlement = await writeStorageEntitlement(bucket, { userId, planId, billingStatus, currentPeriodEnd: periodEnd });
  return { entitlement, subscription };
}
__name(activateEntitlementFromStripeSession, "activateEntitlementFromStripeSession");
async function syncEntitlementFromStripeSubscription(bucket, subscription) {
  const metadata = subscription?.metadata || {};
  const userId = String(metadata.userId || metadata.user_id || "").trim();
  const planId = String(metadata.planId || metadata.plan_id || "").trim();
  if (!userId || !STORAGE_BILLING_PLANS[planId]) return null;
  const billingStatus = String(subscription?.status || "canceled").toLowerCase();
  const periodEnd = subscription?.current_period_end ? new Date(Number(subscription.current_period_end) * 1e3).toISOString() : null;
  return writeStorageEntitlement(bucket, { userId, planId, billingStatus, currentPeriodEnd: periodEnd });
}
__name(syncEntitlementFromStripeSubscription, "syncEntitlementFromStripeSubscription");
function sortBackupsNewestFirst(rows) {
  return [...rows].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
}
__name(sortBackupsNewestFirst, "sortBackupsNewestFirst");
function activeBackups(rows) {
  return sortBackupsNewestFirst(rows.filter((row) => !row.deletedAt));
}
__name(activeBackups, "activeBackups");
async function retryPendingCleanup(bucket, manifest) {
  const pending = Array.from(new Set((manifest.cleanupKeys || []).filter(Boolean)));
  if (!pending.length) return;
  const results = await Promise.allSettled(
    pending.map((key) => bucket.delete(key))
  );
  const failed = pending.filter((_, index) => results[index]?.status === "rejected");
  if (failed.length !== pending.length) {
    manifest.cleanupKeys = failed;
    await writeManifest(bucket, manifest);
  }
}
__name(retryPendingCleanup, "retryPendingCleanup");
async function cleanupLegacyFullBackups(bucket, userId) {
  const prefix = `users/${safeId(userId)}/backups/cloud_sync_v1/`;
  let cursor = void 0;
  let deleted = 0;
  for (let page = 0; page < 10; page += 1) {
    const listed = await bucket.list({ prefix, cursor, limit: 1e3 });
    const keys = Array.isArray(listed?.objects) ? listed.objects.map((o) => String(o?.key || "")).filter(Boolean) : [];
    if (keys.length) {
      await Promise.all(keys.map(async (key) => {
        try {
          await bucket.delete(key);
          deleted += 1;
        } catch {
        }
      }));
    }
    if (!listed?.truncated || !listed?.cursor) break;
    cursor = String(listed.cursor);
  }
  return deleted;
}
__name(cleanupLegacyFullBackups, "cleanupLegacyFullBackups");
function backupTimestampFromObjectKey(key) {
  const match2 = String(key || "").match(/\/r2b_(\d{10,})_[a-zA-Z0-9]+\.json$/);
  const value = Number(match2?.[1] || 0);
  return Number.isFinite(value) ? value : 0;
}
__name(backupTimestampFromObjectKey, "backupTimestampFromObjectKey");
async function cleanupOrphanedGenerationalBackups(bucket, userId) {
  const latestManifest = await readManifest(bucket, userId);
  const retained = activeBackups(latestManifest.backups).slice(0, R2_BACKUP_RETENTION_TOTAL);
  const retainedKeys = new Set(retained.map((row) => row.objectKey));
  const retainedTimes = retained.map((row) => Date.parse(row.updatedAt || row.createdAt || "")).filter((value) => Number.isFinite(value) && value > 0);
  const safeCutoff = retainedTimes.length ? Math.min(...retainedTimes) : Date.now();
  const prefix = `users/${safeId(userId)}/backups/`;
  let cursor = void 0;
  let deleted = 0;
  for (let page = 0; page < 10; page += 1) {
    const listed = await bucket.list({ prefix, cursor, limit: 1e3 });
    const candidates = (Array.isArray(listed?.objects) ? listed.objects : []).map((object) => String(object?.key || "")).filter((key) => key.startsWith(`${prefix}r2b_`) && key.endsWith(".json")).filter((key) => !retainedKeys.has(key)).filter((key) => {
      const timestamp = backupTimestampFromObjectKey(key);
      return timestamp > 0 && timestamp < safeCutoff;
    });
    if (candidates.length) {
      const results = await Promise.allSettled(candidates.map((key) => bucket.delete(key)));
      deleted += results.filter((result) => result.status === "fulfilled").length;
    }
    if (!listed?.truncated || !listed?.cursor) break;
    cursor = String(listed.cursor);
  }
  return deleted;
}
__name(cleanupOrphanedGenerationalBackups, "cleanupOrphanedGenerationalBackups");
function usagePayload(manifest, plan) {
  const backupBytes = activeBackups(manifest.backups).reduce((sum, row) => sum + Number(row.sizeBytes || 0), 0);
  const baseUsedBytes = Math.max(0, Number(plan.baseUsedBytes || 0));
  const usedBytes = baseUsedBytes + backupBytes;
  const quotaBytes = Number(plan.quotaBytes || 0);
  return {
    usedBytes,
    backupBytes,
    baseUsedBytes,
    quotaBytes,
    remainingBytes: quotaBytes >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Math.max(0, quotaBytes - usedBytes),
    percentUsed: quotaBytes > 0 && quotaBytes < Number.MAX_SAFE_INTEGER ? Math.min(100, Math.max(0, usedBytes / quotaBytes * 100)) : 0,
    planId: String(plan.planId || "free_test_100mb"),
    billingStatus: String(plan.billingStatus || "free"),
    billingExempt: plan.billingExempt === true,
    writeAllowed: ["active", "trialing"].includes(String(plan.billingStatus || "").toLowerCase()) && PAID_STORAGE_PLAN_IDS.has(String(plan.planId || "")),
    premiumRequired: !(["active", "trialing"].includes(String(plan.billingStatus || "").toLowerCase()) && PAID_STORAGE_PLAN_IDS.has(String(plan.planId || ""))),
    planSource: String(plan.source || "unknown"),
    retainedBackups: activeBackups(manifest.backups).length,
    retentionTotal: R2_BACKUP_RETENTION_TOTAL
  };
}
__name(usagePayload, "usagePayload");
async function readManifest(bucket, userId) {
  const object = await bucket.get(manifestKey(userId));
  if (!object) return { version: 2, userId, updatedAt: (/* @__PURE__ */ new Date(0)).toISOString(), backups: [], cleanupKeys: [] };
  try {
    const parsed = JSON.parse(await object.text());
    return {
      version: 2,
      userId,
      updatedAt: String(parsed?.updatedAt || ""),
      backups: Array.isArray(parsed?.backups) ? parsed.backups : [],
      cleanupKeys: Array.isArray(parsed?.cleanupKeys) ? parsed.cleanupKeys.filter(Boolean) : []
    };
  } catch {
    return { version: 2, userId, updatedAt: (/* @__PURE__ */ new Date(0)).toISOString(), backups: [], cleanupKeys: [] };
  }
}
__name(readManifest, "readManifest");
async function writeManifest(bucket, manifest) {
  manifest.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await bucket.put(manifestKey(manifest.userId), JSON.stringify(manifest), { httpMetadata: { contentType: "application/json" } });
}
__name(writeManifest, "writeManifest");
async function sha256Hex(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function routeParts(params) {
  const raw = Array.isArray(params?.path) ? params.path.join("/") : String(params?.path || "");
  return raw.split("/").map((v) => v.trim()).filter(Boolean);
}
__name(routeParts, "routeParts");
var onRequest = /* @__PURE__ */ __name(async (context2) => {
  const { request, env: env2, params } = context2;
  try {
    const parts = routeParts(params);
    const method = request.method.toUpperCase();
    const bucket = env2.USER_DATA_BUCKET;
    if (method === "GET" && parts.length === 1 && parts[0] === "status") {
      const auth = authConfigStatus(env2);
      return json3({
        ok: !!bucket,
        route: "cloudflare-pages-r2-direct",
        binding: "USER_DATA_BUCKET",
        bucketReady: !!bucket,
        ...auth,
        retention: { current: 1, previous: 1, total: R2_BACKUP_RETENTION_TOTAL, autoCleanup: true },
        paidPlans: { supported: true, writePolicy: "premium_required", freeWriteQuotaBytes: 0, entitlementSource: "R2 private entitlement written after Stripe confirmation" },
        code: bucket ? void 0 : "r2_binding_missing",
        message: bucket ? "Pages Function R2 pr\xEAte." : "Le binding USER_DATA_BUCKET doit pointer vers multisports-user-data, puis le projet Pages doit \xEAtre red\xE9ploy\xE9."
      }, bucket ? 200 : 503);
    }
    if (!bucket) return json3({
      ok: false,
      code: "r2_binding_missing",
      error: "Binding R2 USER_DATA_BUCKET manquant.",
      message: "Le projet Cloudflare Pages doit lier USER_DATA_BUCKET au bucket multisports-user-data puis \xEAtre red\xE9ploy\xE9."
    }, 503);
    if (method === "POST" && parts.length === 2 && parts[0] === "billing" && parts[1] === "webhook") {
      const rawBody = await request.text();
      const signature = String(request.headers.get("stripe-signature") || "");
      const verified = await verifyStripeWebhook(rawBody, signature, env2);
      if (!verified) return json3({ ok: false, code: "stripe_webhook_signature_invalid", error: "Signature Stripe invalide." }, 400);
      let event = null;
      try {
        event = JSON.parse(rawBody);
      } catch {
        return json3({ ok: false, code: "stripe_webhook_json_invalid", error: "Webhook Stripe illisible." }, 400);
      }
      const eventType = String(event?.type || "");
      const object = event?.data?.object || {};
      try {
        if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
          await activateEntitlementFromStripeSession(bucket, object, env2).catch(async (error3) => {
            const metadata = object?.metadata || {};
            const userId = String(metadata.userId || object?.client_reference_id || "").trim();
            const planId = String(metadata.planId || "").trim();
            if (userId && STORAGE_BILLING_PLANS[planId]) {
              await writeStorageEntitlement(bucket, { userId, planId, billingStatus: "pending" });
              return;
            }
            throw error3;
          });
        } else if (eventType === "customer.subscription.updated" || eventType === "customer.subscription.created" || eventType === "customer.subscription.deleted") {
          await syncEntitlementFromStripeSubscription(bucket, object);
        }
      } catch (error3) {
        return json3({ ok: true, received: true, eventType, synchronized: false, warning: String(error3?.message || error3 || "sync_failed") });
      }
      return json3({ ok: true, received: true, eventType, synchronized: true });
    }
    const identity = await resolveIdentity(request, env2);
    if (parts.length === 2 && parts[0] === "billing" && parts[1] === "status" && method === "GET") {
      const allPriceEnv = Object.values(STORAGE_BILLING_PLANS).flatMap((plan2) => [plan2.monthlyEnv, plan2.yearlyEnv]);
      const missingEnv = allPriceEnv.filter((key) => !String(env2[key] || "").trim()).map(String);
      const secret = String(env2.STRIPE_SECRET_KEY || "").trim();
      const webhookSecret = String(env2.STRIPE_WEBHOOK_SECRET_STORAGE || env2.STRIPE_STORAGE_WEBHOOK_SECRET || "").trim();
      let verified = false;
      let verifyError = "";
      if (new URL(request.url).searchParams.get("verify") === "1" && secret) {
        try {
          await stripeRequest(env2, "/v1/account");
          verified = true;
        } catch (error3) {
          verifyError = String(error3?.message || error3 || "Stripe inaccessible");
        }
      }
      return json3({
        ok: true,
        configured: !!secret && missingEnv.length === 0,
        provider: "stripe",
        mode: secret.startsWith("sk_live_") ? "live" : secret.startsWith("sk_test_") ? "test" : secret ? "unknown" : "missing",
        secretKeyConfigured: !!secret,
        priceCount: allPriceEnv.length,
        configuredPriceCount: allPriceEnv.length - missingEnv.length,
        missingEnv,
        webhookStorageConfigured: !!webhookSecret,
        webhookSecretEnvName: env2.STRIPE_WEBHOOK_SECRET_STORAGE ? "STRIPE_WEBHOOK_SECRET_STORAGE" : env2.STRIPE_STORAGE_WEBHOOK_SECRET ? "STRIPE_STORAGE_WEBHOOK_SECRET" : null,
        webhookEndpoint: "/api/storage/backups/billing/webhook",
        checkoutEndpoint: "/api/storage/backups/billing/checkout",
        verified: new URL(request.url).searchParams.get("verify") === "1" ? verified : void 0,
        verifyError: verifyError || void 0
      });
    }
    if (parts.length === 2 && parts[0] === "billing" && parts[1] === "checkout" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const planId = String(body?.planId || "").trim();
      const interval = String(body?.interval || "monthly").trim() === "yearly" ? "yearly" : "monthly";
      const plan2 = STORAGE_BILLING_PLANS[planId];
      if (!plan2) return json3({ ok: false, code: "premium_plan_required", error: "Choisis une offre Cloud R2 PREMIUM." }, 400);
      const priceEnv = interval === "yearly" ? plan2.yearlyEnv : plan2.monthlyEnv;
      const priceId = String(env2[priceEnv] || "").trim();
      if (!priceId) return json3({ ok: false, code: "stripe_price_missing", missingEnv: String(priceEnv), error: `Prix Stripe non configur\xE9 (${String(priceEnv)}).` }, 503);
      const requestUrl = new URL(request.url);
      const origin = requestUrl.origin;
      const successUrl = String(body?.successUrl || `${origin}/#/settings?account=storage&storage_checkout=success&session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = String(body?.cancelUrl || `${origin}/#/settings?account=storage&storage_checkout=cancel`);
      const form = new URLSearchParams();
      form.set("mode", "subscription");
      form.set("success_url", successUrl);
      form.set("cancel_url", cancelUrl);
      form.set("line_items[0][price]", priceId);
      form.set("line_items[0][quantity]", "1");
      form.set("client_reference_id", identity.userId);
      form.set("allow_promotion_codes", "true");
      form.set("metadata[feature]", "storage_r2");
      form.set("metadata[userId]", identity.userId);
      form.set("metadata[planId]", planId);
      form.set("metadata[interval]", interval);
      form.set("subscription_data[metadata][feature]", "storage_r2");
      form.set("subscription_data[metadata][userId]", identity.userId);
      form.set("subscription_data[metadata][planId]", planId);
      if (identity.email) form.set("customer_email", identity.email);
      const session = await stripeRequest(env2, "/v1/checkout/sessions", { method: "POST", form });
      await writeStorageEntitlement(bucket, { userId: identity.userId, planId, billingStatus: "pending" });
      return json3({ ok: true, url: session?.url, sessionId: session?.id, planId, interval, stripeMode: String(env2.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test", priceId });
    }
    if (parts.length === 2 && parts[0] === "billing" && parts[1] === "verify" && method === "GET") {
      const sessionId = String(new URL(request.url).searchParams.get("session_id") || "").trim();
      if (!sessionId) return json3({ ok: false, code: "stripe_session_missing", error: "session_id Stripe manquant." }, 400);
      const session = await stripeRequest(env2, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
      const activated = await activateEntitlementFromStripeSession(bucket, session, env2, identity.userId);
      const manifest2 = await readManifest(bucket, identity.userId);
      const plan2 = await resolveStoragePlan(bucket, identity, env2);
      return json3({ ok: true, activated: true, entitlement: activated.entitlement, plan: plan2, usage: usagePayload(manifest2, plan2) });
    }
    if (method === "GET" && parts.length === 2 && parts[0] === "mirror" && parts[1] === "user") {
      const object = await bucket.get(nasUserMirrorKey(identity.userId));
      if (!object) return json3({ ok: false, code: "nas_user_mirror_missing", error: "Miroir utilisateur R2 introuvable." }, 404);
      try {
        const mirror = JSON.parse(await object.text());
        return json3({ ok: true, mirror, authMode: identity.authMode });
      } catch {
        return json3({ ok: false, code: "nas_user_mirror_invalid", error: "Miroir utilisateur R2 illisible." }, 500);
      }
    }
    if (method === "GET" && parts.length === 1 && parts[0] === "media-manifest") {
      const manifest2 = await readMediaMirrorManifest(bucket, identity.userId);
      const rows = Object.values(manifest2.media || {});
      const totalBytes = rows.reduce((sum, row2) => sum + Number(row2?.sizeBytes || 0), 0);
      return json3({
        ok: true,
        manifest: manifest2,
        audit: { total: rows.length, totalBytes, updatedAt: manifest2.updatedAt },
        authMode: identity.authMode
      });
    }
    if (parts.length === 2 && parts[0] === "media") {
      const mediaKey = safeId(parts[1]);
      if (!mediaKey) return json3({ ok: false, error: "Cl\xE9 m\xE9dia invalide." }, 400);
      const key = mediaFallbackKey(identity.userId, mediaKey);
      if (method === "GET") {
        const object = await bucket.get(key);
        if (!object) return json3({ ok: false, code: "media_fallback_missing", error: "M\xE9dia R2 introuvable." }, 404);
        try {
          const payload = JSON.parse(await object.text());
          return json3({ ok: true, media: payload, authMode: identity.authMode });
        } catch {
          return json3({ ok: false, code: "media_fallback_invalid", error: "M\xE9dia R2 illisible." }, 500);
        }
      }
      if (method === "POST") {
        const mediaPlan = await resolveStoragePlan(bucket, identity, env2);
        if (!canWritePaidR2(mediaPlan)) return json3({
          ok: false,
          code: "premium_required",
          error: "Cloud R2 verrouill\xE9 : une offre PREMIUM active est requise pour toute nouvelle \xE9criture.",
          usage: usagePayload(await readManifest(bucket, identity.userId), mediaPlan)
        }, 402);
        const body = await request.json();
        const dataUrl = String(body?.dataUrl || "").trim();
        if (!/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(dataUrl)) {
          return json3({ ok: false, error: "Image de secours invalide." }, 400);
        }
        const sizeBytes = new TextEncoder().encode(dataUrl).byteLength;
        const configuredMax = Math.max(32 * 1024 * 1024, Number(env2.CLOUD_OBJECT_MAX_UPLOAD_BYTES || 0));
        const maxBytes = configuredMax;
        if (sizeBytes > maxBytes) {
          return json3({ ok: false, error: `Image miroir trop volumineuse (${sizeBytes} octets, max ${maxBytes}).` }, 413);
        }
        const checksum = await sha256Hex(dataUrl);
        const payload = {
          version: 2,
          key: mediaKey,
          kind: String(body?.kind || "user_image").slice(0, 80),
          dataUrl,
          sizeBytes,
          checksum,
          updatedAtMs: Number(body?.updatedAt || Date.now()) || Date.now(),
          sourceUrl: body?.sourceUrl ? String(body.sourceUrl).slice(0, 1600) : null,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await bucket.put(key, JSON.stringify(payload), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: { userId: identity.userId, mediaKey, kind: payload.kind, checksum }
        });
        const mediaManifest = await readMediaMirrorManifest(bucket, identity.userId);
        mediaManifest.media[mediaKey] = {
          key: mediaKey,
          kind: payload.kind,
          sizeBytes,
          checksum,
          updatedAtMs: payload.updatedAtMs,
          sourceUrl: payload.sourceUrl
        };
        await writeMediaMirrorManifest(bucket, mediaManifest);
        return json3({ ok: true, media: payload, audit: { total: Object.keys(mediaManifest.media).length }, authMode: identity.authMode }, 201);
      }
      if (method === "DELETE") {
        await bucket.delete(key);
        const mediaManifest = await readMediaMirrorManifest(bucket, identity.userId);
        delete mediaManifest.media[mediaKey];
        await writeMediaMirrorManifest(bucket, mediaManifest);
        return json3({ ok: true, deleted: true, audit: { total: Object.keys(mediaManifest.media).length } });
      }
    }
    if (parts.length === 2 && parts[0] === "avatar") {
      const profileId = safeId(parts[1]);
      if (!profileId) return json3({ ok: false, error: "Profil avatar invalide." }, 400);
      const key = avatarFallbackKey(identity.userId, profileId);
      if (method === "GET") {
        const object = await bucket.get(key);
        if (!object) return json3({ ok: false, code: "avatar_fallback_missing", error: "Avatar R2 introuvable." }, 404);
        try {
          const payload = JSON.parse(await object.text());
          return json3({ ok: true, avatar: payload, authMode: identity.authMode });
        } catch {
          return json3({ ok: false, code: "avatar_fallback_invalid", error: "Avatar R2 illisible." }, 500);
        }
      }
      if (method === "POST") {
        const avatarPlan = await resolveStoragePlan(bucket, identity, env2);
        if (!canWritePaidR2(avatarPlan)) return json3({
          ok: false,
          code: "premium_required",
          error: "Cloud R2 verrouill\xE9 : une offre PREMIUM active est requise pour toute nouvelle \xE9criture.",
          usage: usagePayload(await readManifest(bucket, identity.userId), avatarPlan)
        }, 402);
        const body = await request.json();
        const dataUrl = String(body?.dataUrl || "").trim();
        if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(dataUrl)) {
          return json3({ ok: false, error: "Miniature avatar invalide." }, 400);
        }
        const sizeBytes = new TextEncoder().encode(dataUrl).byteLength;
        if (sizeBytes > 16e4) {
          return json3({ ok: false, error: `Miniature avatar trop volumineuse (${sizeBytes} octets).` }, 413);
        }
        const payload = {
          version: 1,
          profileId,
          dataUrl,
          avatarUpdatedAt: Number(body?.avatarUpdatedAt || Date.now()) || Date.now(),
          avatarAssetId: body?.avatarAssetId ? String(body.avatarAssetId) : null,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await bucket.put(key, JSON.stringify(payload), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: { userId: identity.userId, profileId, kind: "avatar-fallback-v1" }
        });
        return json3({ ok: true, avatar: payload, authMode: identity.authMode }, 201);
      }
      if (method === "DELETE") {
        await bucket.delete(key);
        return json3({ ok: true, deleted: true });
      }
    }
    const manifest = await readManifest(bucket, identity.userId);
    await retryPendingCleanup(bucket, manifest).catch(() => void 0);
    const plan = await resolveStoragePlan(bucket, identity, env2);
    if (method === "GET" && parts.length === 1 && parts[0] === "usage") {
      return json3({ ok: true, usage: usagePayload(manifest, plan), authMode: identity.authMode });
    }
    if (method === "GET" && parts.length === 0) {
      const url = new URL(request.url);
      const includeDeleted = url.searchParams.get("includeDeleted") === "1";
      const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 30)));
      const visible = manifest.backups.filter((row2) => includeDeleted || !row2.deletedAt).sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt)).slice(0, limit);
      let activeIndex = 0;
      const backups = visible.map((row2) => {
        if (row2.deletedAt) return row2;
        const retentionRole = activeIndex === 0 ? "current" : activeIndex === 1 ? "previous" : "expired";
        activeIndex += 1;
        return { ...row2, metadata: { ...row2.metadata || {}, retentionRole } };
      });
      return json3({ ok: true, backups, usage: usagePayload(manifest, plan), authMode: identity.authMode });
    }
    if (method === "POST" && parts.length === 0) {
      if (!canWritePaidR2(plan)) return json3({
        ok: false,
        code: "premium_required",
        error: "Cloud R2 verrouill\xE9 : une offre PREMIUM active est requise pour sauvegarder sur Cloudflare R2.",
        message: "Le stockage Local / fichier / USB / SD / cloud personnel reste gratuit. R2 n'\xE9crit rien sans abonnement actif.",
        usage: usagePayload(manifest, plan)
      }, 402);
      const body = await request.json();
      const snapshotJson = String(body?.snapshotJson || "");
      if (!snapshotJson) return json3({ ok: false, error: "Snapshot vide." }, 400);
      try {
        JSON.parse(snapshotJson);
      } catch {
        return json3({ ok: false, error: "Snapshot JSON invalide." }, 400);
      }
      const sizeBytes = new TextEncoder().encode(snapshotJson).byteLength;
      const maxUpload = Math.max(1024, Number(env2.CLOUD_OBJECT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024));
      if (sizeBytes > maxUpload) return json3({ ok: false, error: `Sauvegarde trop volumineuse (${sizeBytes} octets).` }, 413);
      const previous = activeBackups(manifest.backups)[0] || null;
      const projectedUsed = Math.max(0, Number(plan.baseUsedBytes || 0)) + sizeBytes + Number(previous?.sizeBytes || 0);
      const quota = Number(plan.quotaBytes || 0);
      if (!plan.billingExempt && projectedUsed > quota) {
        return json3({
          ok: false,
          code: "quota_exceeded",
          error: "Quota Cloud R2 d\xE9pass\xE9.",
          message: `Le plan ${plan.planId} ne peut pas contenir la sauvegarde courante + la pr\xE9c\xE9dente (${projectedUsed} octets > ${quota}).`,
          usage: usagePayload(manifest, plan)
        }, 413);
      }
      const id2 = `r2b_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const objectKey = backupKey(identity.userId, id2);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const checksum = await sha256Hex(snapshotJson);
      await bucket.put(objectKey, snapshotJson, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { userId: identity.userId, backupId: id2, checksum, authMode: identity.authMode }
      });
      const row2 = {
        id: id2,
        objectKey,
        title: String(body?.title || `Sauvegarde Cloud R2 \u2014 ${(/* @__PURE__ */ new Date()).toLocaleString("fr-FR")}`).slice(0, 180),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        sizeBytes,
        checksum,
        summary: body?.summary && typeof body.summary === "object" ? body.summary : {},
        metadata: {
          ...body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
          retentionPolicy: "current_plus_previous"
        }
      };
      const retained = [row2, ...previous ? [previous] : []].slice(0, R2_BACKUP_RETENTION_TOTAL);
      const retainedKeys = new Set(retained.map((item) => item.objectKey));
      const cleanupKeys = Array.from(new Set([
        ...manifest.cleanupKeys || [],
        ...manifest.backups.filter((item) => !retainedKeys.has(item.objectKey)).map((item) => item.objectKey)
      ].filter(Boolean)));
      manifest.backups = retained;
      manifest.cleanupKeys = cleanupKeys;
      await writeManifest(bucket, manifest);
      try {
        context2.waitUntil((async () => {
          if (cleanupKeys.length) {
            await Promise.allSettled(cleanupKeys.map((key) => bucket.delete(key)));
          }
          await cleanupOrphanedGenerationalBackups(bucket, identity.userId).catch(() => 0);
          await cleanupLegacyFullBackups(bucket, identity.userId).catch(() => 0);
        })());
      } catch {
      }
      return json3({
        ok: true,
        backup: { ...row2, metadata: { ...row2.metadata || {}, retentionRole: "current" } },
        previousBackup: previous ? { ...previous, metadata: { ...previous.metadata || {}, retentionRole: "previous" } } : null,
        cleaned: 0,
        cleanupPending: cleanupKeys.length,
        legacyCleaned: 0,
        cleanupScheduled: true,
        retention: { current: 1, previous: 1, total: R2_BACKUP_RETENTION_TOTAL },
        usage: usagePayload(manifest, plan),
        plan: { planId: plan.planId, billingStatus: plan.billingStatus, billingExempt: plan.billingExempt },
        authMode: identity.authMode
      }, 201);
    }
    if (method === "DELETE" && parts.length === 1 && parts[0] === "trash") {
      const deleted = manifest.backups.filter((row2) => !!row2.deletedAt);
      const keys = Array.from(/* @__PURE__ */ new Set([...deleted.map((row2) => row2.objectKey), ...manifest.cleanupKeys || []]));
      await Promise.all(keys.map((key) => bucket.delete(key)));
      manifest.backups = manifest.backups.filter((row2) => !row2.deletedAt);
      manifest.cleanupKeys = [];
      await writeManifest(bucket, manifest);
      return json3({ ok: true, purged: keys.length, usage: usagePayload(manifest, plan) });
    }
    const id = parts[0] || "";
    const index = manifest.backups.findIndex((row2) => row2.id === id);
    if (index < 0) return json3({ ok: false, error: "Sauvegarde introuvable." }, 404);
    const row = manifest.backups[index];
    if (method === "GET" && parts.length === 1) {
      const object = await bucket.get(row.objectKey);
      if (!object) return json3({ ok: false, error: "Fichier R2 introuvable." }, 404);
      return json3({ ok: true, backup: row, snapshotJson: await object.text() });
    }
    if (method === "POST" && parts.length === 2 && parts[1] === "undelete") {
      row.deletedAt = null;
      row.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      manifest.backups[index] = row;
      await writeManifest(bucket, manifest);
      return json3({ ok: true, backup: row });
    }
    if (method === "DELETE" && parts.length === 1) {
      const force = new URL(request.url).searchParams.get("force") === "1";
      if (force) {
        await bucket.delete(row.objectKey);
        manifest.backups.splice(index, 1);
      } else {
        row.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
        row.updatedAt = row.deletedAt;
        manifest.backups[index] = row;
      }
      await writeManifest(bucket, manifest);
      return json3({ ok: true, deleted: true, force });
    }
    return json3({ ok: false, error: "Route stockage inconnue." }, 404);
  } catch (error3) {
    return json3({
      ok: false,
      code: String(error3?.code || "storage_error"),
      error: String(error3?.message || error3 || "Erreur stockage R2")
    }, Number(error3?.status || 500));
  }
}, "onRequest");

// api/avatar/cartoon.ts
function normalizeKeyName(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
__name(normalizeKeyName, "normalizeKeyName");
function maskSecret(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.length <= 12) return `${v.slice(0, 3)}\u2026${v.slice(-2)}`;
  return `${v.slice(0, 7)}\u2026${v.slice(-5)}`;
}
__name(maskSecret, "maskSecret");
function readOpenAiKey(env2) {
  const candidates = [
    "OPENAI_API_KEY",
    "OPENAI_KEY",
    "OPENAI_SECRET_KEY",
    "OPENAI_APIKEY",
    "VITE_OPENAI_API_KEY"
  ];
  for (const name of candidates) {
    const raw = env2?.[name];
    if (typeof raw === "string" && raw.trim()) {
      const key = raw.trim();
      return { key, source: name, preview: maskSecret(key) };
    }
  }
  const wanted = normalizeKeyName("OPENAI_API_KEY");
  for (const [name, raw] of Object.entries(env2 || {})) {
    if (normalizeKeyName(name) === wanted && typeof raw === "string" && raw.trim()) {
      const key = raw.trim();
      return { key, source: name, preview: maskSecret(key) };
    }
  }
  return { key: "", source: null, preview: null };
}
__name(readOpenAiKey, "readOpenAiKey");
function publicError(error3, message, extra = {}, status = 500) {
  return json4({ ok: false, error: error3, message, ...extra }, status);
}
__name(publicError, "publicError");
function readNasApiUrl(env2) {
  const raw = String(
    env2.NAS_API_URL || env2.VITE_NAS_API_URL || env2.API_URL || ""
  ).trim().replace(/\/+$/, "");
  return raw && /^https?:\/\//i.test(raw) ? raw : "";
}
__name(readNasApiUrl, "readNasApiUrl");
async function callNasJson(env2, request, path, body) {
  const base = readNasApiUrl(env2);
  if (!base) return null;
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    throw Object.assign(
      new Error(
        "Session utilisateur requise pour utiliser les cr\xE9dits Avatar IA."
      ),
      { status: 401, code: "auth_required" }
    );
  }
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  const json11 = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(
      new Error(json11?.message || json11?.error || `nas_${response.status}`),
      {
        status: response.status,
        code: json11?.error || "nas_error",
        payload: json11
      }
    );
  }
  return json11;
}
__name(callNasJson, "callNasJson");
async function checkNasAvatarCredit(env2, request) {
  return callNasJson(env2, request, "/avatar-ai/check", {
    source: "cloudflare_avatar_cartoon"
  });
}
__name(checkNasAvatarCredit, "checkNasAvatarCredit");
async function consumeNasAvatarCredit(env2, request, meta) {
  return callNasJson(env2, request, "/avatar-ai/consume", meta);
}
__name(consumeNasAvatarCredit, "consumeNasAvatarCredit");
var STYLE_SNIPPETS = {
  exaggerated_fun: "VERY exaggerated funny cartoon caricature, oversized expressive head, huge eyes, comic nose and big smile, playful asymmetry, bold black outlines, vibrant warm colors, hilarious but friendly, comedy mascot energy",
  exaggerated_realistic: "very caricatured but realistic cartoon portrait, recognizable face, exaggerated facial features while keeping true likeness, polished hand-drawn illustration, premium shading, expressive eyes, confident outlines",
  simple_elegant: "simple elegant caricature portrait, subtle cartoon stylization, clean refined line art, natural expression, tasteful warm lighting, premium profile avatar, not too distorted",
  simple_fun: "simple cartoon fun caricature, friendly smile, light exaggeration, bright colors, clean rounded shapes, playful avatar style, charming and approachable",
  three_d_fun: "3D funny cartoon caricature avatar, toy-like rounded face, oversized head, big expressive eyes, humorous smile, glossy soft lighting, playful stylized 3D character, comedy energy",
  three_d_elegant: "elegant 3D caricature avatar, premium stylized character portrait, soft studio lighting, realistic 3D materials, clean face proportions, slight caricature, polished and classy"
};
var LEGACY_STYLE_MAP = {
  exaggerated: "exaggerated_fun",
  comic: "exaggerated_fun",
  realistic: "exaggerated_realistic",
  flat: "simple_fun"
};
function normalizeStyleId(raw) {
  const value = String(raw || "").trim();
  if (Object.keys(STYLE_SNIPPETS).includes(value))
    return value;
  return LEGACY_STYLE_MAP[value] || "exaggerated_fun";
}
__name(normalizeStyleId, "normalizeStyleId");
function styleGenerationSettings(style) {
  switch (style) {
    case "simple_elegant":
      return { num_steps: 24, strength: 0.56, guidance: 6.8 };
    case "simple_fun":
      return { num_steps: 26, strength: 0.66, guidance: 7.4 };
    case "exaggerated_realistic":
      return { num_steps: 30, strength: 0.7, guidance: 8.2 };
    case "three_d_fun":
      return { num_steps: 32, strength: 0.82, guidance: 9 };
    case "three_d_elegant":
      return { num_steps: 30, strength: 0.68, guidance: 7.8 };
    case "exaggerated_fun":
    default:
      return { num_steps: 32, strength: 0.84, guidance: 9.2 };
  }
}
__name(styleGenerationSettings, "styleGenerationSettings");
function buildPrompt(style) {
  return [
    "Transform the uploaded photo into a square cartoon avatar caricature.",
    "Keep the person recognizable, but make it much more cartoonish, funny and expressive.",
    "Head and shoulders only, centered composition, looking at camera.",
    "Do NOT include text, letters, logo, watermark, badge, circle frame, medallion, UI, hands, or background objects.",
    "Use a simple warm yellow/orange comic background that will fit inside a circular medallion later.",
    STYLE_SNIPPETS[style] || STYLE_SNIPPETS.exaggerated_fun
  ].join(" ");
}
__name(buildPrompt, "buildPrompt");
async function fileToArray(file) {
  const buf = await file.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}
__name(fileToArray, "fileToArray");
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
async function resultToDataUrl(result) {
  if (!result) return null;
  if (typeof result === "string") {
    if (result.startsWith("data:image/")) return result;
    return `data:image/png;base64,${result}`;
  }
  if (result instanceof ReadableStream) {
    const buf = await new Response(result).arrayBuffer();
    return `data:image/png;base64,${arrayBufferToBase64(buf)}`;
  }
  if (result.image && typeof result.image === "string") {
    if (result.image.startsWith("data:image/")) return result.image;
    return `data:image/png;base64,${result.image}`;
  }
  if (result.images?.[0] && typeof result.images[0] === "string") {
    const first = result.images[0];
    if (first.startsWith("data:image/")) return first;
    return `data:image/png;base64,${first}`;
  }
  if (result.data?.[0]?.b64_json && typeof result.data[0].b64_json === "string") {
    return `data:image/webp;base64,${result.data[0].b64_json}`;
  }
  if (result.data?.[0]?.url && typeof result.data[0].url === "string") {
    return result.data[0].url;
  }
  return null;
}
__name(resultToDataUrl, "resultToDataUrl");
async function callOpenAiImageEdit(apiKey, file, style, model = "gpt-image-1") {
  const form = new FormData();
  form.append("model", model);
  form.append("image", file, file.name || "avatar-source.webp");
  form.append("prompt", buildPrompt(style));
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("output_format", "webp");
  form.append("output_compression", "82");
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });
  const text = await response.text();
  let json11 = null;
  try {
    json11 = JSON.parse(text);
  } catch {
  }
  if (!response.ok) {
    const msg = json11?.error?.message || text || `openai_${response.status}`;
    throw new Error(msg);
  }
  return await resultToDataUrl(json11);
}
__name(callOpenAiImageEdit, "callOpenAiImageEdit");
async function callCloudflareAi(env2, file, style) {
  if (!env2.AI?.run) return null;
  const prompt = buildPrompt(style);
  const image = await fileToArray(file);
  const candidates = [
    "@cf/runwayml/stable-diffusion-v1-5-img2img",
    "@cf/lykon/dreamshaper-8-lcm"
  ];
  let lastError = "";
  for (const model of candidates) {
    try {
      const result = await env2.AI.run(model, {
        prompt,
        image,
        ...styleGenerationSettings(style)
      });
      const dataUrl = await resultToDataUrl(result);
      if (dataUrl) return dataUrl;
      lastError = "empty_ai_result";
    } catch (err) {
      lastError = String(err?.message || err || "ai_error");
    }
  }
  throw new Error(lastError || "cloudflare_ai_failed");
}
__name(callCloudflareAi, "callCloudflareAi");
var onRequestPost2 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json4({ ok: false, error: "invalid_content_type" }, 400);
    }
    const form = await request.formData();
    const file = form.get("image");
    const styleRaw = String(form.get("style") || "exaggerated_fun");
    const style = normalizeStyleId(styleRaw);
    if (!(file instanceof File)) {
      return json4({ ok: false, error: "missing_image" }, 400);
    }
    if (file.size > 12 * 1024 * 1024) {
      return json4({ ok: false, error: "image_too_large" }, 413);
    }
    let nasCreditBefore = null;
    try {
      nasCreditBefore = await checkNasAvatarCredit(env2, request);
    } catch (creditErr) {
      return publicError(
        creditErr?.code || "avatar_credit_check_failed",
        String(
          creditErr?.message || creditErr || "Cr\xE9dit avatar IA indisponible."
        ),
        { provider: "nas", avatarCredits: creditErr?.payload || null },
        Number(creditErr?.status || 402)
      );
    }
    const openAi = readOpenAiKey(env2);
    const openAiKey = openAi.key;
    const openAiModel = String(env2.OPENAI_IMAGE_MODEL || "gpt-image-1").trim() || "gpt-image-1";
    if (openAiKey) {
      try {
        const dataUrl = await callOpenAiImageEdit(
          openAiKey,
          file,
          style,
          openAiModel
        );
        if (dataUrl) {
          const avatarCredits = await consumeNasAvatarCredit(env2, request, {
            provider: "openai",
            model: openAiModel,
            style
          }).catch((err) => ({
            ok: false,
            error: err?.code || "consume_failed",
            message: String(err?.message || err)
          }));
          return json4(
            {
              ok: true,
              cartoonWebp: dataUrl,
              provider: "openai",
              style,
              keySource: openAi.source,
              keyPreview: openAi.preview,
              model: openAiModel,
              avatarCredits,
              creditChecked: !!nasCreditBefore
            },
            200
          );
        }
      } catch (err) {
        const openAiMessage = String(err?.message || err || "openai_error");
        try {
          const dataUrl = await callCloudflareAi(env2, file, style);
          if (dataUrl) {
            const avatarCredits = await consumeNasAvatarCredit(env2, request, {
              provider: "cloudflare",
              model: "workers-ai",
              style
            }).catch((err2) => ({
              ok: false,
              error: err2?.code || "consume_failed",
              message: String(err2?.message || err2)
            }));
            return json4(
              {
                ok: true,
                cartoonPng: dataUrl,
                provider: "cloudflare",
                fallbackFrom: "openai",
                openAiMessage,
                style,
                keySource: openAi.source,
                keyPreview: openAi.preview,
                model: openAiModel,
                avatarCredits,
                creditChecked: !!nasCreditBefore
              },
              200
            );
          }
        } catch (cfErr) {
          return publicError(
            "ai_generation_failed",
            openAiMessage,
            {
              provider: "openai",
              fallbackMessage: String(
                cfErr?.message || cfErr || "cloudflare_error"
              ),
              keySource: openAi.source,
              keyPreview: openAi.preview,
              model: openAiModel
            },
            502
          );
        }
      }
    }
    try {
      const dataUrl = await callCloudflareAi(env2, file, style);
      if (dataUrl) {
        const avatarCredits = await consumeNasAvatarCredit(env2, request, {
          provider: "cloudflare",
          model: "workers-ai",
          style
        }).catch((err) => ({
          ok: false,
          error: err?.code || "consume_failed",
          message: String(err?.message || err)
        }));
        return json4(
          {
            ok: true,
            cartoonPng: dataUrl,
            provider: "cloudflare",
            style,
            avatarCredits,
            creditChecked: !!nasCreditBefore
          },
          200
        );
      }
    } catch (err) {
      return publicError(
        "ai_generation_failed",
        String(err?.message || err || "cloudflare_error"),
        { provider: "cloudflare", cloudflareAiBinding: Boolean(env2.AI?.run) },
        502
      );
    }
    return publicError(
      "openai_key_missing",
      "OPENAI_API_KEY absente c\xF4t\xE9 Cloudflare Pages Function runtime. V\xE9rifie variable Production/Runtime puis red\xE9ploie.",
      {
        provider: "none",
        envKeysVisible: Object.keys(env2 || {}).filter((k) => !/KEY|TOKEN|SECRET|PASSWORD|PWD/i.test(k)).sort(),
        sensitiveKeysDetected: Object.keys(env2 || {}).filter((k) => /OPENAI|AI|KEY|TOKEN|SECRET/i.test(k)).sort(),
        cloudflareAiBinding: Boolean(env2.AI?.run)
      },
      503
    );
  } catch (err) {
    return publicError(
      "exception",
      String(err?.message || err || "Unknown error"),
      {},
      500
    );
  }
}, "onRequestPost");
function json4(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
__name(json4, "json");

// api/avatar/checkout.ts
var PACKS = {
  pack10: { label: "Pack 10 avatars IA", credits: 10, amount: 199 },
  pack30: { label: "Pack 30 avatars IA", credits: 30, amount: 499 },
  pack100: { label: "Pack 100 avatars IA", credits: 100, amount: 999 }
};
function json5(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
__name(json5, "json");
function safeUrl(raw, fallback) {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (!/^https?:\/\//i.test(value)) return fallback;
  return value;
}
__name(safeUrl, "safeUrl");
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const secret = String(env2.STRIPE_SECRET_KEY || "").trim();
    if (!secret) {
      return json5({ ok: false, error: "stripe_secret_missing", message: "STRIPE_SECRET_KEY absente c\xF4t\xE9 Cloudflare." }, 503);
    }
    const body = await request.json().catch(() => ({}));
    const packId = String(body?.packId || "");
    const pack = PACKS[packId];
    if (!pack) return json5({ ok: false, error: "invalid_pack" }, 400);
    const url = new URL(request.url);
    const origin = url.origin;
    const successUrl = safeUrl(body?.successUrl || env2.STRIPE_SUCCESS_URL, `${origin}/#/avatar_creator?avatarCheckout=success&session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = safeUrl(body?.cancelUrl || env2.STRIPE_CANCEL_URL, `${origin}/#/avatar_creator?avatarCheckout=cancel`);
    const accountKey = String(body?.accountKey || "local_device").slice(0, 160);
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("payment_method_types[]", "card");
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "eur");
    params.set("line_items[0][price_data][unit_amount]", String(pack.amount));
    params.set("line_items[0][price_data][product_data][name]", pack.label);
    params.set("line_items[0][price_data][product_data][description]", `${pack.credits} g\xE9n\xE9rations Avatar IA pour Multisports Scoring`);
    params.set("metadata[feature]", "avatar_ia");
    params.set("metadata[packId]", packId);
    params.set("metadata[credits]", String(pack.credits));
    params.set("metadata[accountKey]", accountKey);
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const text = await stripeRes.text();
    let stripeJson = null;
    try {
      stripeJson = JSON.parse(text);
    } catch {
    }
    if (!stripeRes.ok) {
      return json5({ ok: false, error: "stripe_checkout_failed", message: stripeJson?.error?.message || text || `stripe_${stripeRes.status}` }, 502);
    }
    return json5({ ok: true, url: stripeJson?.url, id: stripeJson?.id, packId, credits: pack.credits });
  } catch (err) {
    return json5({ ok: false, error: "checkout_exception", message: String(err?.message || err || "Unknown error") }, 500);
  }
}, "onRequestPost");

// api/avatar/checkout-verify.ts
function json6(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
__name(json6, "json");
var onRequestGet3 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const secret = String(env2.STRIPE_SECRET_KEY || "").trim();
    if (!secret) return json6({ ok: false, error: "stripe_secret_missing", message: "STRIPE_SECRET_KEY absente c\xF4t\xE9 Cloudflare." }, 503);
    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get("session_id") || "").trim();
    if (!sessionId || !sessionId.startsWith("cs_")) return json6({ ok: false, error: "missing_session_id" }, 400);
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    const text = await stripeRes.text();
    let stripeJson = null;
    try {
      stripeJson = JSON.parse(text);
    } catch {
    }
    if (!stripeRes.ok) return json6({ ok: false, error: "stripe_session_failed", message: stripeJson?.error?.message || text }, 502);
    const paid = stripeJson?.payment_status === "paid" || stripeJson?.status === "complete";
    const feature = String(stripeJson?.metadata?.feature || "");
    const credits = Math.max(0, Math.floor(Number(stripeJson?.metadata?.credits || 0)));
    if (!paid || feature !== "avatar_ia" || credits <= 0) {
      return json6({ ok: false, paid, error: "session_not_creditable", status: stripeJson?.status, paymentStatus: stripeJson?.payment_status }, 400);
    }
    return json6({ ok: true, paid: true, credits, packId: stripeJson?.metadata?.packId || null, accountKey: stripeJson?.metadata?.accountKey || null });
  } catch (err) {
    return json6({ ok: false, error: "verify_exception", message: String(err?.message || err || "Unknown error") }, 500);
  }
}, "onRequestGet");

// api/avatar/debug.ts
function normalizeKeyName2(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
__name(normalizeKeyName2, "normalizeKeyName");
function maskSecret2(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.length <= 12) return `${v.slice(0, 3)}\u2026${v.slice(-2)}`;
  return `${v.slice(0, 7)}\u2026${v.slice(-5)}`;
}
__name(maskSecret2, "maskSecret");
function readOpenAiKey2(env2) {
  const candidates = [
    "OPENAI_API_KEY",
    "OPENAI_KEY",
    "OPENAI_SECRET_KEY",
    "OPENAI_APIKEY",
    "VITE_OPENAI_API_KEY"
  ];
  for (const name of candidates) {
    const raw = env2?.[name];
    if (typeof raw === "string" && raw.trim()) {
      const value = raw.trim();
      return { expected: "OPENAI_API_KEY", found: true, source: name, valuePreview: maskSecret2(value), length: value.length };
    }
  }
  const wanted = normalizeKeyName2("OPENAI_API_KEY");
  for (const [name, raw] of Object.entries(env2 || {})) {
    if (normalizeKeyName2(name) === wanted && typeof raw === "string" && raw.trim()) {
      const value = raw.trim();
      return { expected: "OPENAI_API_KEY", found: true, source: name, valuePreview: maskSecret2(value), length: value.length };
    }
  }
  return { expected: "OPENAI_API_KEY", found: false, source: null, valuePreview: null, length: 0 };
}
__name(readOpenAiKey2, "readOpenAiKey");
var onRequestGet4 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
  const url = new URL(request.url);
  const probe = readOpenAiKey2(env2);
  const envKeys = Object.keys(env2 || {}).sort();
  const publicEnvKeys = envKeys.filter((key) => !/KEY|TOKEN|SECRET|PASSWORD|PWD/i.test(key));
  const sensitiveEnvKeysDetected = envKeys.filter((key) => /OPENAI|AI|KEY|TOKEN|SECRET/i.test(key)).map((key) => ({ name: key, masked: key === probe.source ? probe.valuePreview : "present_or_binding" }));
  return json7(
    {
      ok: true,
      route: "/api/avatar/debug",
      now: (/* @__PURE__ */ new Date()).toISOString(),
      host: url.host,
      openai: probe,
      cloudflareAiBinding: Boolean(env2?.AI && typeof env2.AI.run === "function"),
      openaiImageModel: typeof env2?.OPENAI_IMAGE_MODEL === "string" && env2.OPENAI_IMAGE_MODEL.trim() ? env2.OPENAI_IMAGE_MODEL.trim() : "gpt-image-1",
      publicEnvKeys,
      sensitiveEnvKeysDetected,
      advice: probe.found ? "OPENAI_API_KEY est visible par la Function runtime. Si /cartoon \xE9choue encore, regarder status/provider/message." : "OPENAI_API_KEY n'est pas visible par la Function runtime. V\xE9rifier variable Runtime Production, nom exact, puis red\xE9ployer."
    },
    200
  );
}, "onRequestGet");
function json7(payload, status) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
__name(json7, "json");

// api/avatar/stripe-webhook.ts
function json8(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
__name(json8, "json");
var onRequestPost4 = /* @__PURE__ */ __name(async ({ request }) => {
  const event = await request.json().catch(() => null);
  const type = String(event?.type || "unknown");
  return json8({ ok: true, received: true, type, note: "Webhook placeholder: connecter NAS/DB pour cr\xE9dits serveur persistants." });
}, "onRequestPost");

// api/avatar/test.ts
var MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";
function json9(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
__name(json9, "json");
var onRequestGet5 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
  try {
    const prompt = "Simple cartoon icon of a dart player face, gold and black colors.";
    const result = await env2.AI.run(MODEL_ID, {
      prompt,
      // image: new Uint8Array(), // à tester si besoin
      strength: 0.6
    });
    const isArrayBuffer = result instanceof ArrayBuffer;
    const isUint8Array = result instanceof Uint8Array;
    let previewDataUrl = null;
    if (isArrayBuffer || isUint8Array) {
      const bytes = isArrayBuffer ? new Uint8Array(result) : result;
      let bin = "";
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(bin);
      previewDataUrl = `data:image/png;base64,${b64}`;
    }
    return json9({
      ok: true,
      modelId: MODEL_ID,
      typeofResult: typeof result,
      constructorName: result && result.constructor?.name,
      isArrayBuffer,
      isUint8Array,
      hasPreview: !!previewDataUrl,
      previewDataUrl
    });
  } catch (err) {
    console.error("[avatar/test] error", err);
    return json9(
      {
        ok: false,
        error: "ai_run_failed",
        message: err && err.message ? String(err.message) : "Unknown error"
      },
      500
    );
  }
}, "onRequestGet");

// api/viewer/session.ts
var onRequestOptions4 = /* @__PURE__ */ __name(async () => options(), "onRequestOptions");
var onRequestPost5 = /* @__PURE__ */ __name(async ({ request, env: env2 }) => {
  try {
    const store = await ensureStore(env2);
    let sessionId = "";
    for (let i = 0; i < 8; i += 1) {
      const candidate = cleanId(randomCode(6));
      const existing = await store.get(sessionKey(candidate));
      if (!existing) {
        sessionId = candidate;
        break;
      }
    }
    if (!sessionId) return json({ ok: false, message: "Unable to create viewer session" }, 500);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const meta = {
      kind: "viewer_live_v1",
      sessionId,
      code: sessionId,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
      rev: 0
    };
    await store.put(sessionKey(sessionId), JSON.stringify(meta), { expirationTtl: SESSION_TTL_SECONDS });
    await store.put(
      snapshotKey(sessionId),
      JSON.stringify({
        v: 1,
        sessionId,
        updatedAt: Date.now(),
        sport: "darts",
        game: "unknown",
        phase: "lobby",
        title: "Multisports Scoring",
        screen: "waiting",
        activePlayerId: null,
        players: [],
        meta: { text: "En attente du lancement de la partie" },
        source: "viewer"
      }),
      { expirationTtl: SNAPSHOT_TTL_SECONDS }
    );
    return json({
      ok: true,
      sessionId,
      code: sessionId,
      expiresInSeconds: SESSION_TTL_SECONDS,
      joinUrl: joinUrl(request, sessionId)
    });
  } catch (e) {
    return json({ ok: false, message: String(e?.message || e || "Viewer session creation failed") }, 500);
  }
}, "onRequestPost");

// api/storage/backups/_middleware.ts
var PROD_ORIGIN = "https://multisports-scoring.pages.dev";
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === PROD_ORIGIN || origin === "capacitor://localhost") return true;
  try {
    const url = new URL(origin);
    const host = String(url.hostname || "").toLowerCase();
    return (url.protocol === "http:" || url.protocol === "https:") && (host === "localhost" || host === "127.0.0.1" || host === "::1");
  } catch {
    return false;
  }
}
__name(isAllowedOrigin, "isAllowedOrigin");
function corsHeaders(origin) {
  const allowOrigin = isAllowedOrigin(origin) ? String(origin) : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonWithCors(body, origin, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  });
}
__name(jsonWithCors, "jsonWithCors");
var onRequest2 = /* @__PURE__ */ __name(async (context2) => {
  const origin = context2.request.headers.get("Origin");
  const method = context2.request.method.toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  const response = await context2.next();
  if (method === "GET" && response.status === 404) {
    const pathname = new URL(context2.request.url).pathname;
    if (pathname.includes("/api/storage/backups/media/")) {
      return jsonWithCors({ ok: true, media: null, missing: true }, origin, 200);
    }
    if (pathname.includes("/api/storage/backups/avatar/")) {
      return jsonWithCors({ ok: true, avatar: null, missing: true }, origin, 200);
    }
  }
  const next = new Response(response.body, response);
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) next.headers.set(key, String(value));
  return next;
}, "onRequest");

// api/backend/[[path]].ts
var DEFAULT_BACKEND = "https://api.multisports-api.fr";
var HOP_BY_HOP = /* @__PURE__ */ new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);
function json10(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-multisports-pages-proxy": "1"
    }
  });
}
__name(json10, "json");
var onRequest3 = /* @__PURE__ */ __name(async ({ request, env: env2, params }) => {
  const pathValue = Array.isArray(params?.path) ? params.path.join("/") : String(params?.path || "");
  const base = String(env2?.MULTISPORTS_BACKEND_URL || DEFAULT_BACKEND).trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(base)) return json10({ ok: false, error: "backend_url_invalid" }, 500);
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${base}/${pathValue.replace(/^\/+/, "")}`);
  upstreamUrl.search = incomingUrl.search;
  const headers = new Headers(request.headers);
  for (const name of Array.from(headers.keys())) {
    if (HOP_BY_HOP.has(name.toLowerCase()) || name.toLowerCase().startsWith("cf-")) headers.delete(name);
  }
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
  headers.set("x-multisports-pages-proxy", "1");
  const method = request.method.toUpperCase();
  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? void 0 : request.body,
      redirect: "manual"
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of Array.from(responseHeaders.keys())) {
      if (HOP_BY_HOP.has(name.toLowerCase())) responseHeaders.delete(name);
    }
    responseHeaders.set("cache-control", "no-store");
    responseHeaders.set("x-multisports-pages-proxy", "1");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error3) {
    return json10({
      ok: false,
      code: "backend_proxy_unreachable",
      error: "Le proxy Cloudflare Pages ne parvient pas \xE0 joindre le backend NAS/R2.",
      detail: String(error3?.message || error3 || "Erreur r\xE9seau"),
      upstream: base
    }, 502);
  }
}, "onRequest");

// ../.wrangler/tmp/pages-zIRqs2/functionsRoutes-0.11728432344433348.mjs
var routes = [
  {
    routePath: "/api/viewer/session/:sessionId/snapshot",
    mountPath: "/api/viewer/session/:sessionId",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/viewer/session/:sessionId/snapshot",
    mountPath: "/api/viewer/session/:sessionId",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/viewer/session/:sessionId/snapshot",
    mountPath: "/api/viewer/session/:sessionId",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/running/routes/catalog",
    mountPath: "/api/running/routes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/running/routes/catalog",
    mountPath: "/api/running/routes",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/viewer/session/:sessionId",
    mountPath: "/api/viewer/session",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/viewer/session/:sessionId",
    mountPath: "/api/viewer/session",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/storage/backups/:path*",
    mountPath: "/api/storage/backups",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/avatar/cartoon",
    mountPath: "/api/avatar",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/avatar/checkout",
    mountPath: "/api/avatar",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/avatar/checkout-verify",
    mountPath: "/api/avatar",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/avatar/debug",
    mountPath: "/api/avatar",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/avatar/stripe-webhook",
    mountPath: "/api/avatar",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/avatar/test",
    mountPath: "/api/avatar",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/viewer/session",
    mountPath: "/api/viewer",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/viewer/session",
    mountPath: "/api/viewer",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/storage/backups",
    mountPath: "/api/storage/backups",
    method: "",
    middlewares: [onRequest2],
    modules: []
  },
  {
    routePath: "/api/backend/:path*",
    mountPath: "/api/backend",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options2) {
  if (options2 === void 0) {
    options2 = {};
  }
  var tokens = lexer(str);
  var _a = options2.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options2.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options2) {
  var keys = [];
  var re = pathToRegexp(str, keys, options2);
  return regexpToFunction(re, keys, options2);
}
__name(match, "match");
function regexpToFunction(re, keys, options2) {
  if (options2 === void 0) {
    options2 = {};
  }
  var _a = options2.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options2) {
  return options2 && options2.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options2) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options2).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options2));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options2) {
  return tokensToRegexp(parse(path, options2), keys, options2);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options2) {
  if (options2 === void 0) {
    options2 = {};
  }
  var _a = options2.strict, strict = _a === void 0 ? false : _a, _b = options2.start, start = _b === void 0 ? true : _b, _c = options2.end, end = _c === void 0 ? true : _c, _d = options2.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options2.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options2.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options2.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options2));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options2) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options2);
  return stringToRegexp(path, keys, options2);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
