var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
	if (Module.hasOwnProperty(key)) {
		moduleOverrides[key] = Module[key]
	}
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function (status, toThrow) {
	throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = true;
ENVIRONMENT_IS_WORKER = true;
ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";

function locateFile(path) {
	if (Module["locateFile"]) {
		return Module["locateFile"](path, scriptDirectory)
	}
	return scriptDirectory + path
}
var read_, readAsync, readBinary;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
	if (ENVIRONMENT_IS_WORKER) {
		scriptDirectory = require("path").dirname(scriptDirectory) + "/"
	} else {
		scriptDirectory = __dirname + "/"
	}
	read_ = function shell_read(filename, binary) {
		if (!nodeFS) nodeFS = require("fs");
		if (!nodePath) nodePath = require("path");
		filename = nodePath["normalize"](filename);
		return nodeFS["readFileSync"](filename, binary ? null : "utf8")
	};
	readBinary = function readBinary(filename) {
		var ret = read_(filename, true);
		if (!ret.buffer) {
			ret = new Uint8Array(ret)
		}
		assert(ret.buffer);
		return ret
	};
	if (process["argv"].length > 1) {
		thisProgram = process["argv"][1].replace(/\\/g, "/")
	}
	arguments_ = process["argv"].slice(2);
	if (typeof module !== "undefined") {
		module["exports"] = Module
	}
	process["on"]("uncaughtException", function (ex) {
		if (!(ex instanceof ExitStatus)) {
			throw ex
		}
	});
	process["on"]("unhandledRejection", abort);
	quit_ = function (status) {
		process["exit"](status)
	};
	Module["inspect"] = function () {
		return "[Emscripten Module object]"
	}
} else if (ENVIRONMENT_IS_SHELL) {
	if (typeof read != "undefined") {
		read_ = function shell_read(f) {
			return read(f)
		}
	}
	readBinary = function readBinary(f) {
		var data;
		if (typeof readbuffer === "function") {
			return new Uint8Array(readbuffer(f))
		}
		data = read(f, "binary");
		assert(typeof data === "object");
		return data
	};
	if (typeof scriptArgs != "undefined") {
		arguments_ = scriptArgs
	} else if (typeof arguments != "undefined") {
		arguments_ = arguments
	}
	if (typeof quit === "function") {
		quit_ = function (status) {
			quit(status)
		}
	}
	if (typeof print !== "undefined") {
		if (typeof console === "undefined") console = {};
		console.log = print;
		console.warn = console.error = typeof printErr !== "undefined" ? printErr : print
	}
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
		scriptDirectory = self.location.href
	if (scriptDirectory.indexOf("blob:") !== 0) {
		scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)
	} else {
		scriptDirectory = ""
	} {
		read_ = function shell_read(url) {
			var xhr = new XMLHttpRequest;
			xhr.open("GET", url, false);
			xhr.send(null);
			return xhr.responseText
		};
		if (ENVIRONMENT_IS_WORKER) {
			readBinary = function readBinary(url) {
				var xhr = new XMLHttpRequest;
				xhr.open("GET", url, false);
				xhr.responseType = "arraybuffer";
				xhr.send(null);
				return new Uint8Array(xhr.response)
			}
		}
		readAsync = function readAsync(url, onload, onerror) {
			var xhr = new XMLHttpRequest;
			xhr.open("GET", url, true);
			xhr.responseType = "arraybuffer";
			xhr.onload = function xhr_onload() {
				if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
					onload(xhr.response);
					return
				}
				onerror()
			};
			xhr.onerror = onerror;
			xhr.send(null)
		}
	}
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
	if (moduleOverrides.hasOwnProperty(key)) {
		Module[key] = moduleOverrides[key]
	}
}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime;
if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
if (typeof WebAssembly !== "object") {
	err("no native wasm support detected")
}
var wasmMemory;
var wasmTable = new WebAssembly.Table({
	"initial": 743,
	"maximum": 743 + 0,
	"element": "anyfunc"
});
var ABORT = false;
var EXITSTATUS = 0;

function assert(condition, text) {
	if (!condition) {
		abort("Assertion failed: " + text)
	}
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
	if (!(maxBytesToWrite > 0)) return 0;
	var startIdx = outIdx;
	var endIdx = outIdx + maxBytesToWrite - 1;
	for (var i = 0; i < str.length; ++i) {
		var u = str.charCodeAt(i);
		if (u >= 55296 && u <= 57343) {
			var u1 = str.charCodeAt(++i);
			u = 65536 + ((u & 1023) << 10) | u1 & 1023
		}
		if (u <= 127) {
			if (outIdx >= endIdx) break;
			heap[outIdx++] = u
		} else if (u <= 2047) {
			if (outIdx + 1 >= endIdx) break;
			heap[outIdx++] = 192 | u >> 6;
			heap[outIdx++] = 128 | u & 63
		} else if (u <= 65535) {
			if (outIdx + 2 >= endIdx) break;
			heap[outIdx++] = 224 | u >> 12;
			heap[outIdx++] = 128 | u >> 6 & 63;
			heap[outIdx++] = 128 | u & 63
		} else {
			if (outIdx + 3 >= endIdx) break;
			heap[outIdx++] = 240 | u >> 18;
			heap[outIdx++] = 128 | u >> 12 & 63;
			heap[outIdx++] = 128 | u >> 6 & 63;
			heap[outIdx++] = 128 | u & 63
		}
	}
	heap[outIdx] = 0;
	return outIdx - startIdx
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
	return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function lengthBytesUTF8(str) {
	var len = 0;
	for (var i = 0; i < str.length; ++i) {
		var u = str.charCodeAt(i);
		if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
		if (u <= 127) ++len;
		else if (u <= 2047) len += 2;
		else if (u <= 65535) len += 3;
		else len += 4
	}
	return len
}

function allocateUTF8(str) {
	var size = lengthBytesUTF8(str) + 1;
	var ret = _malloc(size);
	if (ret) stringToUTF8Array(str, HEAP8, ret, size);
	return ret
}
var WASM_PAGE_SIZE = 65536;
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
	buffer = buf;
	Module["HEAP8"] = HEAP8 = new Int8Array(buf);
	Module["HEAP16"] = HEAP16 = new Int16Array(buf);
	Module["HEAP32"] = HEAP32 = new Int32Array(buf);
	Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
	Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
	Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
	Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
	Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}
var DYNAMIC_BASE = 40160016,
	DYNAMICTOP_PTR = 34916976;
var INITIAL_INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 41943040;
if (Module["wasmMemory"]) {
	wasmMemory = Module["wasmMemory"]
} else {
	wasmMemory = new WebAssembly.Memory({
		"initial": INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE,
		"maximum": INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE
	})
}
if (wasmMemory) {
	buffer = wasmMemory.buffer
}
INITIAL_INITIAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;

function callRuntimeCallbacks(callbacks) {
	while (callbacks.length > 0) {
		var callback = callbacks.shift();
		if (typeof callback == "function") {
			callback(Module);
			continue
		}
		var func = callback.func;
		if (typeof func === "number") {
			if (callback.arg === undefined) {
				Module["dynCall_v"](func)
			} else {
				Module["dynCall_vi"](func, callback.arg)
			}
		} else {
			func(callback.arg === undefined ? null : callback.arg)
		}
	}
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
	if (Module["preRun"]) {
		if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
		while (Module["preRun"].length) {
			addOnPreRun(Module["preRun"].shift())
		}
	}
	callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime() {
	runtimeInitialized = true;
	callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
	callRuntimeCallbacks(__ATMAIN__)
}

function exitRuntime() {
	runtimeExited = true
}

function postRun() {
	if (Module["postRun"]) {
		if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
		while (Module["postRun"].length) {
			addOnPostRun(Module["postRun"].shift())
		}
	}
	callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
	__ATPRERUN__.unshift(cb)
}

function addOnPostRun(cb) {
	__ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function addRunDependency(id) {
	runDependencies++;
	if (Module["monitorRunDependencies"]) {
		Module["monitorRunDependencies"](runDependencies)
	}
}

function removeRunDependency(id) {
	runDependencies--;
	if (Module["monitorRunDependencies"]) {
		Module["monitorRunDependencies"](runDependencies)
	}
	if (runDependencies == 0) {
		if (runDependencyWatcher !== null) {
			clearInterval(runDependencyWatcher);
			runDependencyWatcher = null
		}
		if (dependenciesFulfilled) {
			var callback = dependenciesFulfilled;
			dependenciesFulfilled = null;
			callback()
		}
	}
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};

function abort(what) {
	if (Module["onAbort"]) {
		Module["onAbort"](what)
	}
	what += "";
	out(what);
	err(what);
	ABORT = true;
	EXITSTATUS = 1;
	what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
	throw new WebAssembly.RuntimeError(what)
}

function hasPrefix(str, prefix) {
	return String.prototype.startsWith ? str.startsWith(prefix) : str.indexOf(prefix) === 0
}
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
	return hasPrefix(filename, dataURIPrefix)
}
var fileURIPrefix = "file://";

function isFileURI(filename) {
	return hasPrefix(filename, fileURIPrefix)
}
var wasmBinaryFile = 'a.out.wasm';
if (!isDataURI(wasmBinaryFile)) {
	wasmBinaryFile = locateFile(wasmBinaryFile)
}

function getBinary() {
	try {
		if (wasmBinary) {
			return new Uint8Array(wasmBinary)
		}
		if (readBinary) {
			return readBinary(wasmBinaryFile)
		} else {
			throw "both async and sync fetching of the wasm failed"
		}
	} catch (err) {
		abort(err)
	}
}
var ASM_CONSTS = {
	1024: function ($0) {
		Module.DATA.Img($0);
	},
	1045: function ($0, $1) {
		Module.DATA.sound($0,$1);
		//console.log($0, $1);
	},
	1072: function () {
		Module.DATA.Module_READY();
	}
};

function _emscripten_asm_const_iii(code, sigPtr, argbuf) {
	var args = readAsmConstArgs(sigPtr, argbuf);
	return ASM_CONSTS[code].apply(null, args)
}
__ATINIT__.push({
	func: function () {
		___wasm_call_ctors()
	}
});

function _emscripten_memcpy_big(dest, src, num) {
	HEAPU8.copyWithin(dest, src, src + num)
}

function abortOnCannotGrowMemory(requestedSize) {
	abort("OOM")
}

function _emscripten_resize_heap(requestedSize) {
	requestedSize = requestedSize >>> 0;
	abortOnCannotGrowMemory(requestedSize)
}
var ___tm_current = 34916992;
var ___tm_timezone = (stringToUTF8("GMT", 34917040, 4), 34917040);

function _tzset() {
	if (_tzset.called) return;
	_tzset.called = true;
	HEAP32[__get_timezone() >> 2] = (new Date).getTimezoneOffset() * 60;
	var currentYear = (new Date).getFullYear();
	var winter = new Date(currentYear, 0, 1);
	var summer = new Date(currentYear, 6, 1);
	HEAP32[__get_daylight() >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());

	function extractZone(date) {
		var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
		return match ? match[1] : "GMT"
	}
	var winterName = extractZone(winter);
	var summerName = extractZone(summer);
	var winterNamePtr = allocateUTF8(winterName);
	var summerNamePtr = allocateUTF8(summerName);
	if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
		HEAP32[__get_tzname() >> 2] = winterNamePtr;
		HEAP32[__get_tzname() + 4 >> 2] = summerNamePtr
	} else {
		HEAP32[__get_tzname() >> 2] = summerNamePtr;
		HEAP32[__get_tzname() + 4 >> 2] = winterNamePtr
	}
}

function _localtime_r(time, tmPtr) {
	_tzset();
	var date = new Date(HEAP32[time >> 2] * 1e3);
	HEAP32[tmPtr >> 2] = date.getSeconds();
	HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
	HEAP32[tmPtr + 8 >> 2] = date.getHours();
	HEAP32[tmPtr + 12 >> 2] = date.getDate();
	HEAP32[tmPtr + 16 >> 2] = date.getMonth();
	HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
	HEAP32[tmPtr + 24 >> 2] = date.getDay();
	var start = new Date(date.getFullYear(), 0, 1);
	var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
	HEAP32[tmPtr + 28 >> 2] = yday;
	HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
	var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
	var winterOffset = start.getTimezoneOffset();
	var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
	HEAP32[tmPtr + 32 >> 2] = dst;
	var zonePtr = HEAP32[__get_tzname() + (dst ? 4 : 0) >> 2];
	HEAP32[tmPtr + 40 >> 2] = zonePtr;
	return tmPtr
}

function _localtime(time) {
	console.log(this);
	return _localtime_r(time, ___tm_current)
}

function _time(ptr) {
	var ret = Date.now() / 1e3 | 0;
	if (ptr) {
		HEAP32[ptr >> 2] = ret
	}
	return ret
}
var __readAsmConstArgsArray = [];

function readAsmConstArgs(sigPtr, buf) {
	__readAsmConstArgsArray.length = 0;
	var ch;
	buf >>= 2;
	while (ch = HEAPU8[sigPtr++]) {
		__readAsmConstArgsArray.push(ch < 105 ? HEAPF64[++buf >> 1] : HEAP32[buf]);
		++buf
	}
	return __readAsmConstArgsArray
}
var asmLibraryArg = {
	"a": _emscripten_asm_const_iii,
	"d": _emscripten_memcpy_big,
	"e": _emscripten_resize_heap,
	"b": _localtime,
	"memory": wasmMemory,
	"table": wasmTable,
	"c": _time
};
var asm = {};
addRunDependency("wasm-instantiate");
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function () {
	return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["f"]).apply(null, arguments)
};
var _malloc = Module["_malloc"] = function () {
	return (_malloc = Module["_malloc"] = Module["asm"]["g"]).apply(null, arguments)
};
var _loadRom = Module["_loadRom"] = function () {
	return (_loadRom = Module["_loadRom"] = Module["asm"]["h"]).apply(null, arguments)
};
var _updateSaveBufState = Module["_updateSaveBufState"] = function () {
	return (_updateSaveBufState = Module["_updateSaveBufState"] = Module["asm"]["i"]).apply(null, arguments)
};
var _getBuffer = Module["_getBuffer"] = function () {
	return (_getBuffer = Module["_getBuffer"] = Module["asm"]["j"]).apply(null, arguments)
};
var _runFrame = Module["_runFrame"] = function () {
	return (_runFrame = Module["_runFrame"] = Module["asm"]["k"]).apply(null, arguments)
};
var _resetCpu = Module["_resetCpu"] = function () {
	return (_resetCpu = Module["_resetCpu"] = Module["asm"]["l"]).apply(null, arguments)
};
var _main = Module["_main"] = function () {
	return (_main = Module["_main"] = Module["asm"]["m"]).apply(null, arguments)
};
var _readU32 = Module["_readU32"] = function () {
	return (_readU32 = Module["_readU32"] = Module["asm"]["n"]).apply(null, arguments)
};
var _writeU32 = Module["_writeU32"] = function () {
	return (_writeU32 = Module["_writeU32"] = Module["asm"]["o"]).apply(null, arguments)
};
var _realloc = Module["_realloc"] = function () {
	return (_realloc = Module["_realloc"] = Module["asm"]["p"]).apply(null, arguments)
};
var __get_tzname = Module["__get_tzname"] = function () {
	return (__get_tzname = Module["__get_tzname"] = Module["asm"]["q"]).apply(null, arguments)
};
var __get_daylight = Module["__get_daylight"] = function () {
	return (__get_daylight = Module["__get_daylight"] = Module["asm"]["r"]).apply(null, arguments)
};
var __get_timezone = Module["__get_timezone"] = function () {
	return (__get_timezone = Module["__get_timezone"] = Module["asm"]["s"]).apply(null, arguments)
};
var dynCall_v = Module["dynCall_v"] = function () {
	return (dynCall_v = Module["dynCall_v"] = Module["asm"]["t"]).apply(null, arguments)
};
var dynCall_vi = Module["dynCall_vi"] = function () {
	return (dynCall_vi = Module["dynCall_vi"] = Module["asm"]["u"]).apply(null, arguments)
};
var calledRun;

class ExitStatus {
	constructor(status) {
		this.name = "ExitStatus";
		this.message = "Program terminated with exit(" + status + ")";
		this.status = status;
	}
}
var calledMain = false;
dependenciesFulfilled = function runCaller() {
	if (!calledRun) run();
	if (!calledRun) dependenciesFulfilled = runCaller
};

function callMain(args) {
	var entryFunction = Module["_main"];
	var argc = 0;
	var argv = 0;
	try {
		var ret = entryFunction(argc, argv);
		exit(ret, true)
	} catch (e) {
		if (e instanceof ExitStatus) {
			return
		} else if (e == "unwind") {
			noExitRuntime = true;
			return
		} else {
			var toLog = e;
			if (e && typeof e === "object" && e.stack) {
				toLog = [e, e.stack]
			}
			err("exception thrown: " + toLog);
			quit_(1, e)
		}
	} finally {
		calledMain = true
	}
}

function run(args) {
	args = args || arguments_;
	if (runDependencies > 0) {
		return
	}
	preRun();
	if (runDependencies > 0) return;

	function doRun() {
		if (calledRun) return;
		calledRun = true;
		Module["calledRun"] = true;
		if (ABORT) return;
		initRuntime();
		preMain();
		if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
		if (shouldRunNow) callMain(args);
		postRun()
	}
	if (Module["setStatus"]) {
		Module["setStatus"]("Running...");
		setTimeout(function () {
			setTimeout(function () {
				Module["setStatus"]("")
			}, 1);
			doRun()
		}, 1)
	} else {
		doRun()
	}
}
Module["run"] = run;

function exit(status, implicit) {
	if (implicit && noExitRuntime && status === 0) {
		return
	}
	if (noExitRuntime) {} else {
		ABORT = true;
		EXITSTATUS = status;
		exitRuntime();
		if (Module["onExit"]) Module["onExit"](status)
	}
	quit_(status, new ExitStatus(status))
}
if (Module["preInit"]) {
	if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
	while (Module["preInit"].length > 0) {
		Module["preInit"].pop()()
	}
}
var shouldRunNow = true;
if (Module["noInitialRun"]) shouldRunNow = false;
noExitRuntime = true;
run();
Module.DATA = new class {
	isRunning = false;
	wasmSaveBufLen = 0x20000 + 0x2000;
	lastCheckedSaveState = 0;
	VK = 0;
	frameCnt = 0;
	audioFifoHead = 0;
	audioFifoCnt = 0;
	AUDIO_BLOCK_SIZE = 1024;
	AUDIO_FIFO_MAXLEN = 4900;
	audioFifo0 = new Int16Array(this.AUDIO_FIFO_MAXLEN);
	audioFifo1 = new Int16Array(this.AUDIO_FIFO_MAXLEN);
	audioData0 = new Int16Array(this.AUDIO_BLOCK_SIZE);
	audioData1 = new Int16Array(this.AUDIO_BLOCK_SIZE);
	sound(ptr, frames) {
		if (!this.SoundActive) return;
		if (!this.wasmAudioBuf) {
			this.wasmAudioBuf = new Int16Array(Module.HEAPU8.buffer).subarray(ptr / 2, ptr / 2 + 2048);
		}
		var tail = (this.audioFifoHead + this.audioFifoCnt) % this.AUDIO_FIFO_MAXLEN;
		if (this.audioFifoCnt + frames >= this.AUDIO_FIFO_MAXLEN) {
			//console.log('audio fifo overflow (wow)', this.audioFifoCnt)
			return;
		}
		for (var i = 0; i < frames; i++) {
			this.audioFifo0[tail] = this.wasmAudioBuf[i * 2];
			this.audioFifo1[tail] = this.wasmAudioBuf[i * 2 + 1];
			tail = (tail + 1) % this.AUDIO_FIFO_MAXLEN;
		}
		this.audioFifoCnt += frames;

		if (this.stopMusic) {
			for (var i = 0; i < this.AUDIO_BLOCK_SIZE; i++) {
				this.audioData0[i] = 0;
				this.audioData1[i] = 0;
			}

			return
		}
		while (this.audioFifoCnt < this.AUDIO_BLOCK_SIZE) {
			//console.log(this.audioFifoCnt,'audio fifo underflow, running a new frame')
			return;
		}

		var copySize = this.AUDIO_BLOCK_SIZE;
		if (this.audioFifoCnt < copySize) {
			copySize = this.audioFifoCnt;
		}
		for (var i = 0; i < copySize; i++) {
			this.audioData0[i] = this.audioFifo0[this.audioFifoHead];
			this.audioData1[i] = this.audioFifo1[this.audioFifoHead];
			this.audioFifoHead = (this.audioFifoHead + 1) % this.AUDIO_FIFO_MAXLEN;
			this.audioFifoCnt--;
		}
		this.frames =frames;
		this.copySize = parseInt(copySize);
	}
	Img(ptr) {
		this.picptr = ptr;
	}
	FrameCheck() {
		let state = this.ASM_UpSavBuf();
		//console.log(state)
		if ((this.lastCheckedSaveState == 1) && (state == 0)) {
			//,data:this.wasmSaveBuf
			this.SAVE_SRM();
		}
		this.lastCheckedSaveState = state;
	}
	FrameFuc() {
		this.ASM_Frame(this.VK);
		//发送图像声音
		let data = {
			"code": "sendStatus",
			"pic": this.GETU8(new Uint8ClampedArray(Module.HEAPU8.buffer).subarray(this.picptr, this.picptr + 240 * 160 * 4))
		};
		if (this.SoundActive){
			data.sound = [
				this.audioData0,
				this.audioData1,
				this.copySize,
			];
			data.frames=this.frames
		}
		postMessage(data, [data.pic.buffer]);
		data = null;
		/**
		 * 
		let data = {
			code: "sendStatus",
			frames: frames,
			sound: [
				this.audioData0,
				this.audioData1,
				copySize,
			]
		};
		postMessage(data);
		 */
		//Module._runFrame(this.VK);
	}
	Frame(FPS) {
		clearInterval(this.Timer);
		this.FPS = FPS + 1;
		this.Timer = setInterval(
			() => {
				if (!this.isRunning) {
					return;
				}
				this.frameCnt++;
				if (this.frameCnt % this.FPS == 0) {
					//每一秒 进行帧检测
					this.FrameCheck();
					this.frameCnt = 0;
				}
				this.FrameFuc(FPS);
			}, 1000 / FPS
		);
	}

	constructor() {
		this.WORKER_STATUS = {
			"wasm":(e)=>this.GET_ASM(e),
			"sendgba":(e)=>this.LOADGAME(e.data,e.name),
			"sendSav":(e)=>this.LOADSAVE(e.data),
			'sendStatus':(result)=>{
				let action = result.action;
				if(action){
					if(action=='reset')this.ASM_RESET();
					else if(action=='turbo')this.OpenTurbo(result.type);
					else if(action=='music')this.OpenMusic();
				}if(this){
					if(typeof result.VK != 'undefined'){
						this.VK = result.VK;
					}
				}
			},
			"nextFrame":()=>odule.DATA.FrameFuc(),
			"sendFile":result=>{
				if(!result ||!result.data) return ;
				this.LOAD_FILE(result.data,result.name);
				result = null;
			},
			"showList":result=>{
				this.DB_ALL(list=>{
					postMessage({'code':'showList',data:list});
				});
			},
			"action":result=>{
				let action = result.action,file=result.file;
				if(action=='read'){
					if(file == 'lastRunGame') return this.MSG('这不是文件');
					else if(file == 'gba.wasm') return this.MSG('这不是文件');
					else if(file.indexOf('game--') ==0) this.LOADGAME(null,file);
					else if(file.indexOf('srm--') ==0) this.LOADSAVE(null,file);
					else if(file.indexOf('game-') ==0){
						this.getDB(file).then(data=>{
							if(data){
								this.removeDB(file);
								this.LOADGAME(data,file.replace('game-',''));
							}
						});

					}else if(file.indexOf('save-') ==0){
						this.getDB(file).then(data=>{
							if(data){
								this.removeDB(file);
								this.LOADSAVE(data,file.replace('save-',''));
							}
						});

					}
				}else if(action=='del'){
					this.removeDB(file)
				}else if(action=='down'){
					if(file == 'lastRunGame') return this.MSG('这不是文件');
					this.getDB(file).then(data=>{
						postMessage({code:'sendFile',data,file});
					});
				}
			},
			"changeDB":result=>{
				let DB = result.data;
				if(DB=='DB1'){
					this.DB = localForage;
				}else if(DB=='DB2'){
					this.DB = localForage.createInstance({
						'name': 'NengeApp',
						'storeName': "VBA-WASM"
					});
				}else if(DB=='DB3'){
					this.DB = localForage.createInstance({
						'name': 'NengeNet',
						'storeName': "VBA-WASM"
					});
				}
				this.WORKER_STATUS["showList"]();
			}
		};
	}
	Module_READY() {
		this.romBuffer = this.ASM_GET_Buffer(1);
		this.ptr = this.ASM_GET_Buffer(0);
		this.wasmSaveBuf = Module.HEAPU8.subarray(this.ptr, this.ptr + this.wasmSaveBufLen);
		this.Frame(60);
		this.LOADGAME();
	}
	SoundActive = false;
	OpenMusic() {
		this.SoundActive = this.SoundActive ? false : true;
	}
	OpenTurbo(bool) {
		return bool ? this.Frame(1000) : this.Frame(60);
	}
	GETU8(u8) {
		return new Uint8Array(u8);
	}
	LOADGAME(u8,GameName) {
		let loadGame = Buf => {
			if (!Buf) return postMessage({
				'code': 'needgba'
			});
			Module.HEAPU8.set(Buf, this.romBuffer);
			this.ASM_ROOM_Length(Buf.length);
			if(this.lastGameName != this.GameName)this.setDB('lastRunGame', this.GameName);
			Buf = null;
			this.LOADSAVE();
		};
		if (!u8&&!GameName) {
			this.getDB("lastRunGame").then(lastGameName => {
				if (!lastGameName) return loadGame();
				this.lastGameName = lastGameName;
				this.GameName = lastGameName;
				this.getDB(lastGameName).then(data => loadGame(data));
			});
		}else if (u8) {
			if (!u8) loadGame();
			let gameBuf = this.GETU8(u8);
			u8 = null;
			if(!GameName){
				GameName = '未命名游戏';
				for (var i = 0xAC; i < 0xB2; i++) {
					GameName += String.fromCharCode(u8[i]);
				}
			}
			this.GameName = 'game--' +GameName;
			this.setDB(this.GameName, gameBuf).then(result=>{
				loadGame(gameBuf);
			});
		} else if (GameName) {
			this.getDB(GameName).then(data => {
				this.GameName = GameName
				loadGame(data);
			});
		}
	}
	SAVE_SRM(){
		this.MSG('存档中！');
		this.setDB(this.GetSrmName(),new Uint8Array(this.wasmSaveBuf));
	}
	LOADSAVE(result,SrmName) {
		let loadSrm = (data) => {
			let msg;
			if (data) {
				msg = '存档读取成功！';
				this.wasmSaveBuf.set(this.GETU8(data));
				data = null;result=null;
			} else msg = '游戏已加载,但没找到存档!';
			this.lastCheckedSaveState = 0;
			this.ASM_UpSavBuf();
			this.ASM_RESET();
			this.isRunning = true;
			this.MSG(msg);

		}
		if(this.GameName){
			if(result){
				this.MSG('你覆盖了存档<br>但是并没有储存！<br>需要游戏中储存。');
				return loadSrm(result);
			}else if(!SrmName){
				SrmName  = this.GetSrmName();
			}
			this.getDB(SrmName).then(data => loadSrm(data));
		}else if(SrmName&&result){
			this.MSG('游戏没有运行！<br>所以储存了：'+GameName);
			this.setDB(this.GetSrmName(GameName),result);
		}
	}
	LOAD_FILE(u8,fileName,isZIP){
		if(!u8)return;
		u8 = new Uint8Array(u8);
		let GameName = fileName;
		if (u8[0xB2] == 0x96) {
			//gba
			if(isZIP){
				return this.setDB('game--'+GameName,u8);
			}
			this.MSG('上传了一个:'+GameName);
			this.LOADGAME(u8,GameName);
		}else if(u8[0]==80&&u8[1]==75){
			JSZip.loadAsync(u8).then(ZipFile=>{
				let READ_ZIP = file=>{
					ZipFile.file(file).async("uint8array").then(u8=>{
						this.LOAD_FILE(u8,file,true);
					});
				};
				let files = [];
				for(let File in ZipFile.files){
					READ_ZIP(File);
					files.push(File);
				}
				this.MSG('你上传了一个压缩文件.含有：<br>'+files.join('<br>'));

			});
		}else if(GameName){
			let REG = new RegExp(/^.*\.srm$/,'i');
			if(REG.test(GameName)){
				this.LOADSAVE(u8,GameName);
			}
		}

	}
	ASM_UpSavBuf() {
		//刷新状态
		return Module["asm"]["i"]();
	}
	ASM_RESET() {
		//重启
		return Module["asm"]["l"]();
	}
	ASM_ROOM_Length(length) {
		//rom长度
		console.log(length);
		return Module["asm"]["h"](length);
	}
	ASM_Frame(VK){
		//控制动画 下一帧 VK是控制输入
		return Module["asm"]["k"](VK);
	}
	//var DYNAMIC_BASE = 40160016,
	//DYNAMICTOP_PTR = 34916976;
	ASM_GET_Buffer(int){
		//0存档数据开始位置399024 + 139264 => 538288
		//1 游戏数据填充位置 34777088=>68331520
		//游戏长度 33554432

		return Module["asm"]["j"](int||0);
	}
	ASM_main() {
		return Module["asm"]["m"]();
	}
	ASM_MALLOC(){
		//返回一个随机值
		return  Module["asm"]["g"]();
	}
	ASM_WASM_CALL_CTORS(){
		//会崩溃
		return Module["asm"]["f"]();
	}
	ASM_address_read(address){
		return Module["asm"]["n"](address);
	}
	ASM_address_write(address,value){
		return Module["asm"]["n"](address,value);
	}
	ASM_GET_tzname(){
		return Module["asm"]["q"]();
	}
	ASM_GET_daylight(){
		return Module["asm"]["r"](address,value);
	}
	ASM_GET_timezone(){
		return Module["asm"]["s"](address,value);
	}
	ASM_GET_dynCall_v(){
		return Module["asm"]["t"](address,value);
	}
	ASM_GET_dynCall_vi(){
		return Module["asm"]["u"](address,value);
	}
	GetSrmName(GameName) {
		if(!GameName){GameName = this.GameName;}
		else if(GameName.indexOf('game--') !=0) GameName = 'game--'+GameName;
		return GameName.replace('game--', 'srm--');
	}
	async getDB(name) {
		return await this.DB.getItem(name);
	}
	async setDB(name, value) {
		return await this.DB.setItem(name, value);
	}
	async DB_ALL(cb){
		return await this.DB.keys().then(list=>cb(list))
	}
	async removeDB(FILE){
		return await this.DB.removeItem(FILE);
	}
	GET_ASM(result){
		if(!result) return;
		let buf;
		if(result.data){
			 buf = new Uint8Array(result.data);
			 this.setDB('gba.wasm',buf);
			 result.data = null;result=null;
		}else{
			buf = result;
		}
		WebAssembly.instantiate(buf, {a:asmLibraryArg}).then(result=>{
			buf = null;
			Module["asm"] = result.instance.exports;
			asmLibraryArg = null;
			removeRunDependency("wasm-instantiate");
		}).catch(e=>{
			this.MSG('wasm加载失败！');
		});
	}
	MSG(msg){
		return postMessage({code:'msg',message:msg,status:this.isRunning});
	}
};
let localForage = function(a){ return a()}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c||a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){(function(a){"use strict";function c(){k=!0;for(var a,b,c=l.length;c;){for(b=l,l=[],a=-1;++a<c;)b[a]();c=l.length}k=!1}function d(a){1!==l.push(a)||k||e()}var e,f=a.MutationObserver||a.WebKitMutationObserver;if(f){var g=0,h=new f(c),i=a.document.createTextNode("");h.observe(i,{characterData:!0}),e=function(){i.data=g=++g%2}}else if(a.setImmediate||void 0===a.MessageChannel)e="document"in a&&"onreadystatechange"in a.document.createElement("script")?function(){var b=a.document.createElement("script");b.onreadystatechange=function(){c(),b.onreadystatechange=null,b.parentNode.removeChild(b),b=null},a.document.documentElement.appendChild(b)}:function(){setTimeout(c,0)};else{var j=new a.MessageChannel;j.port1.onmessage=c,e=function(){j.port2.postMessage(0)}}var k,l=[];b.exports=d}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],2:[function(a,b,c){"use strict";function d(){}function e(a){if("function"!=typeof a)throw new TypeError("resolver must be a function");this.state=s,this.queue=[],this.outcome=void 0,a!==d&&i(this,a)}function f(a,b,c){this.promise=a,"function"==typeof b&&(this.onFulfilled=b,this.callFulfilled=this.otherCallFulfilled),"function"==typeof c&&(this.onRejected=c,this.callRejected=this.otherCallRejected)}function g(a,b,c){o(function(){var d;try{d=b(c)}catch(b){return p.reject(a,b)}d===a?p.reject(a,new TypeError("Cannot resolve promise with itself")):p.resolve(a,d)})}function h(a){var b=a&&a.then;if(a&&("object"==typeof a||"function"==typeof a)&&"function"==typeof b)return function(){b.apply(a,arguments)}}function i(a,b){function c(b){f||(f=!0,p.reject(a,b))}function d(b){f||(f=!0,p.resolve(a,b))}function e(){b(d,c)}var f=!1,g=j(e);"error"===g.status&&c(g.value)}function j(a,b){var c={};try{c.value=a(b),c.status="success"}catch(a){c.status="error",c.value=a}return c}function k(a){return a instanceof this?a:p.resolve(new this(d),a)}function l(a){var b=new this(d);return p.reject(b,a)}function m(a){function b(a,b){function d(a){g[b]=a,++h!==e||f||(f=!0,p.resolve(j,g))}c.resolve(a).then(d,function(a){f||(f=!0,p.reject(j,a))})}var c=this;if("[object Array]"!==Object.prototype.toString.call(a))return this.reject(new TypeError("must be an array"));var e=a.length,f=!1;if(!e)return this.resolve([]);for(var g=new Array(e),h=0,i=-1,j=new this(d);++i<e;)b(a[i],i);return j}function n(a){function b(a){c.resolve(a).then(function(a){f||(f=!0,p.resolve(h,a))},function(a){f||(f=!0,p.reject(h,a))})}var c=this;if("[object Array]"!==Object.prototype.toString.call(a))return this.reject(new TypeError("must be an array"));var e=a.length,f=!1;if(!e)return this.resolve([]);for(var g=-1,h=new this(d);++g<e;)b(a[g]);return h}var o=a(1),p={},q=["REJECTED"],r=["FULFILLED"],s=["PENDING"];b.exports=e,e.prototype.catch=function(a){return this.then(null,a)},e.prototype.then=function(a,b){if("function"!=typeof a&&this.state===r||"function"!=typeof b&&this.state===q)return this;var c=new this.constructor(d);if(this.state!==s){g(c,this.state===r?a:b,this.outcome)}else this.queue.push(new f(c,a,b));return c},f.prototype.callFulfilled=function(a){p.resolve(this.promise,a)},f.prototype.otherCallFulfilled=function(a){g(this.promise,this.onFulfilled,a)},f.prototype.callRejected=function(a){p.reject(this.promise,a)},f.prototype.otherCallRejected=function(a){g(this.promise,this.onRejected,a)},p.resolve=function(a,b){var c=j(h,b);if("error"===c.status)return p.reject(a,c.value);var d=c.value;if(d)i(a,d);else{a.state=r,a.outcome=b;for(var e=-1,f=a.queue.length;++e<f;)a.queue[e].callFulfilled(b)}return a},p.reject=function(a,b){a.state=q,a.outcome=b;for(var c=-1,d=a.queue.length;++c<d;)a.queue[c].callRejected(b);return a},e.resolve=k,e.reject=l,e.all=m,e.race=n},{1:1}],3:[function(a,b,c){(function(b){"use strict";"function"!=typeof b.Promise&&(b.Promise=a(2))}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{2:2}],4:[function(a,b,c){"use strict";function d(a,b){if(!(a instanceof b))throw new TypeError("Cannot call a class as a function")}function e(){try{if("undefined"!=typeof indexedDB)return indexedDB;if("undefined"!=typeof webkitIndexedDB)return webkitIndexedDB;if("undefined"!=typeof mozIndexedDB)return mozIndexedDB;if("undefined"!=typeof OIndexedDB)return OIndexedDB;if("undefined"!=typeof msIndexedDB)return msIndexedDB}catch(a){return}}function f(){try{if(!ua||!ua.open)return!1;var a="undefined"!=typeof openDatabase&&/(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent)&&!/BlackBerry/.test(navigator.platform),b="function"==typeof fetch&&-1!==fetch.toString().indexOf("[native code");return(!a||b)&&"undefined"!=typeof indexedDB&&"undefined"!=typeof IDBKeyRange}catch(a){return!1}}function g(a,b){a=a||[],b=b||{};try{return new Blob(a,b)}catch(f){if("TypeError"!==f.name)throw f;for(var c="undefined"!=typeof BlobBuilder?BlobBuilder:"undefined"!=typeof MSBlobBuilder?MSBlobBuilder:"undefined"!=typeof MozBlobBuilder?MozBlobBuilder:WebKitBlobBuilder,d=new c,e=0;e<a.length;e+=1)d.append(a[e]);return d.getBlob(b.type)}}function h(a,b){b&&a.then(function(a){b(null,a)},function(a){b(a)})}function i(a,b,c){"function"==typeof b&&a.then(b),"function"==typeof c&&a.catch(c)}function j(a){return"string"!=typeof a&&(console.warn(a+" used as a key, but it is not a string."),a=String(a)),a}function k(){if(arguments.length&&"function"==typeof arguments[arguments.length-1])return arguments[arguments.length-1]}function l(a){for(var b=a.length,c=new ArrayBuffer(b),d=new Uint8Array(c),e=0;e<b;e++)d[e]=a.charCodeAt(e);return c}function m(a){return new va(function(b){var c=a.transaction(wa,Ba),d=g([""]);c.objectStore(wa).put(d,"key"),c.onabort=function(a){a.preventDefault(),a.stopPropagation(),b(!1)},c.oncomplete=function(){var a=navigator.userAgent.match(/Chrome\/(\d+)/),c=navigator.userAgent.match(/Edge\//);b(c||!a||parseInt(a[1],10)>=43)}}).catch(function(){return!1})}function n(a){return"boolean"==typeof xa?va.resolve(xa):m(a).then(function(a){return xa=a})}function o(a){var b=ya[a.name],c={};c.promise=new va(function(a,b){c.resolve=a,c.reject=b}),b.deferredOperations.push(c),b.dbReady?b.dbReady=b.dbReady.then(function(){return c.promise}):b.dbReady=c.promise}function p(a){var b=ya[a.name],c=b.deferredOperations.pop();if(c)return c.resolve(),c.promise}function q(a,b){var c=ya[a.name],d=c.deferredOperations.pop();if(d)return d.reject(b),d.promise}function r(a,b){return new va(function(c,d){if(ya[a.name]=ya[a.name]||B(),a.db){if(!b)return c(a.db);o(a),a.db.close()}var e=[a.name];b&&e.push(a.version);var f=ua.open.apply(ua,e);b&&(f.onupgradeneeded=function(b){var c=f.result;try{c.createObjectStore(a.storeName),b.oldVersion<=1&&c.createObjectStore(wa)}catch(c){if("ConstraintError"!==c.name)throw c;console.warn('The database "'+a.name+'" has been upgraded from version '+b.oldVersion+" to version "+b.newVersion+', but the storage "'+a.storeName+'" already exists.')}}),f.onerror=function(a){a.preventDefault(),d(f.error)},f.onsuccess=function(){var b=f.result;b.onversionchange=function(a){a.target.close()},c(b),p(a)}})}function s(a){return r(a,!1)}function t(a){return r(a,!0)}function u(a,b){if(!a.db)return!0;var c=!a.db.objectStoreNames.contains(a.storeName),d=a.version<a.db.version,e=a.version>a.db.version;if(d&&(a.version!==b&&console.warn('The database "'+a.name+"\" can't be downgraded from version "+a.db.version+" to version "+a.version+"."),a.version=a.db.version),e||c){if(c){var f=a.db.version+1;f>a.version&&(a.version=f)}return!0}return!1}function v(a){return new va(function(b,c){var d=new FileReader;d.onerror=c,d.onloadend=function(c){var d=btoa(c.target.result||"");b({__local_forage_encoded_blob:!0,data:d,type:a.type})},d.readAsBinaryString(a)})}function w(a){return g([l(atob(a.data))],{type:a.type})}function x(a){return a&&a.__local_forage_encoded_blob}function y(a){var b=this,c=b._initReady().then(function(){var a=ya[b._dbInfo.name];if(a&&a.dbReady)return a.dbReady});return i(c,a,a),c}function z(a){o(a);for(var b=ya[a.name],c=b.forages,d=0;d<c.length;d++){var e=c[d];e._dbInfo.db&&(e._dbInfo.db.close(),e._dbInfo.db=null)}return a.db=null,s(a).then(function(b){return a.db=b,u(a)?t(a):b}).then(function(d){a.db=b.db=d;for(var e=0;e<c.length;e++)c[e]._dbInfo.db=d}).catch(function(b){throw q(a,b),b})}function A(a,b,c,d){void 0===d&&(d=1);try{var e=a.db.transaction(a.storeName,b);c(null,e)}catch(e){if(d>0&&(!a.db||"InvalidStateError"===e.name||"NotFoundError"===e.name))return va.resolve().then(function(){if(!a.db||"NotFoundError"===e.name&&!a.db.objectStoreNames.contains(a.storeName)&&a.version<=a.db.version)return a.db&&(a.version=a.db.version+1),t(a)}).then(function(){return z(a).then(function(){A(a,b,c,d-1)})}).catch(c);c(e)}}function B(){return{forages:[],db:null,dbReady:null,deferredOperations:[]}}function C(a){function b(){return va.resolve()}var c=this,d={db:null};if(a)for(var e in a)d[e]=a[e];var f=ya[d.name];f||(f=B(),ya[d.name]=f),f.forages.push(c),c._initReady||(c._initReady=c.ready,c.ready=y);for(var g=[],h=0;h<f.forages.length;h++){var i=f.forages[h];i!==c&&g.push(i._initReady().catch(b))}var j=f.forages.slice(0);return va.all(g).then(function(){return d.db=f.db,s(d)}).then(function(a){return d.db=a,u(d,c._defaultConfig.version)?t(d):a}).then(function(a){d.db=f.db=a,c._dbInfo=d;for(var b=0;b<j.length;b++){var e=j[b];e!==c&&(e._dbInfo.db=d.db,e._dbInfo.version=d.version)}})}function D(a,b){var c=this;a=j(a);var d=new va(function(b,d){c.ready().then(function(){A(c._dbInfo,Aa,function(e,f){if(e)return d(e);try{var g=f.objectStore(c._dbInfo.storeName),h=g.get(a);h.onsuccess=function(){var a=h.result;void 0===a&&(a=null),x(a)&&(a=w(a)),b(a)},h.onerror=function(){d(h.error)}}catch(a){d(a)}})}).catch(d)});return h(d,b),d}function E(a,b){var c=this,d=new va(function(b,d){c.ready().then(function(){A(c._dbInfo,Aa,function(e,f){if(e)return d(e);try{var g=f.objectStore(c._dbInfo.storeName),h=g.openCursor(),i=1;h.onsuccess=function(){var c=h.result;if(c){var d=c.value;x(d)&&(d=w(d));var e=a(d,c.key,i++);void 0!==e?b(e):c.continue()}else b()},h.onerror=function(){d(h.error)}}catch(a){d(a)}})}).catch(d)});return h(d,b),d}function F(a,b,c){var d=this;a=j(a);var e=new va(function(c,e){var f;d.ready().then(function(){return f=d._dbInfo,"[object Blob]"===za.call(b)?n(f.db).then(function(a){return a?b:v(b)}):b}).then(function(b){A(d._dbInfo,Ba,function(f,g){if(f)return e(f);try{var h=g.objectStore(d._dbInfo.storeName);null===b&&(b=void 0);var i=h.put(b,a);g.oncomplete=function(){void 0===b&&(b=null),c(b)},g.onabort=g.onerror=function(){var a=i.error?i.error:i.transaction.error;e(a)}}catch(a){e(a)}})}).catch(e)});return h(e,c),e}function G(a,b){var c=this;a=j(a);var d=new va(function(b,d){c.ready().then(function(){A(c._dbInfo,Ba,function(e,f){if(e)return d(e);try{var g=f.objectStore(c._dbInfo.storeName),h=g.delete(a);f.oncomplete=function(){b()},f.onerror=function(){d(h.error)},f.onabort=function(){var a=h.error?h.error:h.transaction.error;d(a)}}catch(a){d(a)}})}).catch(d)});return h(d,b),d}function H(a){var b=this,c=new va(function(a,c){b.ready().then(function(){A(b._dbInfo,Ba,function(d,e){if(d)return c(d);try{var f=e.objectStore(b._dbInfo.storeName),g=f.clear();e.oncomplete=function(){a()},e.onabort=e.onerror=function(){var a=g.error?g.error:g.transaction.error;c(a)}}catch(a){c(a)}})}).catch(c)});return h(c,a),c}function I(a){var b=this,c=new va(function(a,c){b.ready().then(function(){A(b._dbInfo,Aa,function(d,e){if(d)return c(d);try{var f=e.objectStore(b._dbInfo.storeName),g=f.count();g.onsuccess=function(){a(g.result)},g.onerror=function(){c(g.error)}}catch(a){c(a)}})}).catch(c)});return h(c,a),c}function J(a,b){var c=this,d=new va(function(b,d){if(a<0)return void b(null);c.ready().then(function(){A(c._dbInfo,Aa,function(e,f){if(e)return d(e);try{var g=f.objectStore(c._dbInfo.storeName),h=!1,i=g.openKeyCursor();i.onsuccess=function(){var c=i.result;if(!c)return void b(null);0===a?b(c.key):h?b(c.key):(h=!0,c.advance(a))},i.onerror=function(){d(i.error)}}catch(a){d(a)}})}).catch(d)});return h(d,b),d}function K(a){var b=this,c=new va(function(a,c){b.ready().then(function(){A(b._dbInfo,Aa,function(d,e){if(d)return c(d);try{var f=e.objectStore(b._dbInfo.storeName),g=f.openKeyCursor(),h=[];g.onsuccess=function(){var b=g.result;if(!b)return void a(h);h.push(b.key),b.continue()},g.onerror=function(){c(g.error)}}catch(a){c(a)}})}).catch(c)});return h(c,a),c}function L(a,b){b=k.apply(this,arguments);var c=this.config();a="function"!=typeof a&&a||{},a.name||(a.name=a.name||c.name,a.storeName=a.storeName||c.storeName);var d,e=this;if(a.name){var f=a.name===c.name&&e._dbInfo.db,g=f?va.resolve(e._dbInfo.db):s(a).then(function(b){var c=ya[a.name],d=c.forages;c.db=b;for(var e=0;e<d.length;e++)d[e]._dbInfo.db=b;return b});d=a.storeName?g.then(function(b){if(b.objectStoreNames.contains(a.storeName)){var c=b.version+1;o(a);var d=ya[a.name],e=d.forages;b.close();for(var f=0;f<e.length;f++){var g=e[f];g._dbInfo.db=null,g._dbInfo.version=c}return new va(function(b,d){var e=ua.open(a.name,c);e.onerror=function(a){e.result.close(),d(a)},e.onupgradeneeded=function(){e.result.deleteObjectStore(a.storeName)},e.onsuccess=function(){var a=e.result;a.close(),b(a)}}).then(function(a){d.db=a;for(var b=0;b<e.length;b++){var c=e[b];c._dbInfo.db=a,p(c._dbInfo)}}).catch(function(b){throw(q(a,b)||va.resolve()).catch(function(){}),b})}}):g.then(function(b){o(a);var c=ya[a.name],d=c.forages;b.close();for(var e=0;e<d.length;e++){d[e]._dbInfo.db=null}return new va(function(b,c){var d=ua.deleteDatabase(a.name);d.onerror=function(){var a=d.result;a&&a.close(),c(d.error)},d.onblocked=function(){console.warn('dropInstance blocked for database "'+a.name+'" until all open connections are closed')},d.onsuccess=function(){var a=d.result;a&&a.close(),b(a)}}).then(function(a){c.db=a;for(var b=0;b<d.length;b++)p(d[b]._dbInfo)}).catch(function(b){throw(q(a,b)||va.resolve()).catch(function(){}),b})})}else d=va.reject("Invalid arguments");return h(d,b),d}function M(){return"function"==typeof openDatabase}function N(a){var b,c,d,e,f,g=.75*a.length,h=a.length,i=0;"="===a[a.length-1]&&(g--,"="===a[a.length-2]&&g--);var j=new ArrayBuffer(g),k=new Uint8Array(j);for(b=0;b<h;b+=4)c=Da.indexOf(a[b]),d=Da.indexOf(a[b+1]),e=Da.indexOf(a[b+2]),f=Da.indexOf(a[b+3]),k[i++]=c<<2|d>>4,k[i++]=(15&d)<<4|e>>2,k[i++]=(3&e)<<6|63&f;return j}function O(a){var b,c=new Uint8Array(a),d="";for(b=0;b<c.length;b+=3)d+=Da[c[b]>>2],d+=Da[(3&c[b])<<4|c[b+1]>>4],d+=Da[(15&c[b+1])<<2|c[b+2]>>6],d+=Da[63&c[b+2]];return c.length%3==2?d=d.substring(0,d.length-1)+"=":c.length%3==1&&(d=d.substring(0,d.length-2)+"=="),d}function P(a,b){var c="";if(a&&(c=Ua.call(a)),a&&("[object ArrayBuffer]"===c||a.buffer&&"[object ArrayBuffer]"===Ua.call(a.buffer))){var d,e=Ga;a instanceof ArrayBuffer?(d=a,e+=Ia):(d=a.buffer,"[object Int8Array]"===c?e+=Ka:"[object Uint8Array]"===c?e+=La:"[object Uint8ClampedArray]"===c?e+=Ma:"[object Int16Array]"===c?e+=Na:"[object Uint16Array]"===c?e+=Pa:"[object Int32Array]"===c?e+=Oa:"[object Uint32Array]"===c?e+=Qa:"[object Float32Array]"===c?e+=Ra:"[object Float64Array]"===c?e+=Sa:b(new Error("Failed to get type for BinaryArray"))),b(e+O(d))}else if("[object Blob]"===c){var f=new FileReader;f.onload=function(){var c=Ea+a.type+"~"+O(this.result);b(Ga+Ja+c)},f.readAsArrayBuffer(a)}else try{b(JSON.stringify(a))}catch(c){console.error("Couldn't convert value into a JSON string: ",a),b(null,c)}}function Q(a){if(a.substring(0,Ha)!==Ga)return JSON.parse(a);var b,c=a.substring(Ta),d=a.substring(Ha,Ta);if(d===Ja&&Fa.test(c)){var e=c.match(Fa);b=e[1],c=c.substring(e[0].length)}var f=N(c);switch(d){case Ia:return f;case Ja:return g([f],{type:b});case Ka:return new Int8Array(f);case La:return new Uint8Array(f);case Ma:return new Uint8ClampedArray(f);case Na:return new Int16Array(f);case Pa:return new Uint16Array(f);case Oa:return new Int32Array(f);case Qa:return new Uint32Array(f);case Ra:return new Float32Array(f);case Sa:return new Float64Array(f);default:throw new Error("Unkown type: "+d)}}function R(a,b,c,d){a.executeSql("CREATE TABLE IF NOT EXISTS "+b.storeName+" (id INTEGER PRIMARY KEY, key unique, value)",[],c,d)}function S(a){var b=this,c={db:null};if(a)for(var d in a)c[d]="string"!=typeof a[d]?a[d].toString():a[d];var e=new va(function(a,d){try{c.db=openDatabase(c.name,String(c.version),c.description,c.size)}catch(a){return d(a)}c.db.transaction(function(e){R(e,c,function(){b._dbInfo=c,a()},function(a,b){d(b)})},d)});return c.serializer=Va,e}function T(a,b,c,d,e,f){a.executeSql(c,d,e,function(a,g){g.code===g.SYNTAX_ERR?a.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?",[b.storeName],function(a,h){h.rows.length?f(a,g):R(a,b,function(){a.executeSql(c,d,e,f)},f)},f):f(a,g)},f)}function U(a,b){var c=this;a=j(a);var d=new va(function(b,d){c.ready().then(function(){var e=c._dbInfo;e.db.transaction(function(c){T(c,e,"SELECT * FROM "+e.storeName+" WHERE key = ? LIMIT 1",[a],function(a,c){var d=c.rows.length?c.rows.item(0).value:null;d&&(d=e.serializer.deserialize(d)),b(d)},function(a,b){d(b)})})}).catch(d)});return h(d,b),d}function V(a,b){var c=this,d=new va(function(b,d){c.ready().then(function(){var e=c._dbInfo;e.db.transaction(function(c){T(c,e,"SELECT * FROM "+e.storeName,[],function(c,d){for(var f=d.rows,g=f.length,h=0;h<g;h++){var i=f.item(h),j=i.value;if(j&&(j=e.serializer.deserialize(j)),void 0!==(j=a(j,i.key,h+1)))return void b(j)}b()},function(a,b){d(b)})})}).catch(d)});return h(d,b),d}function W(a,b,c,d){var e=this;a=j(a);var f=new va(function(f,g){e.ready().then(function(){void 0===b&&(b=null);var h=b,i=e._dbInfo;i.serializer.serialize(b,function(b,j){j?g(j):i.db.transaction(function(c){T(c,i,"INSERT OR REPLACE INTO "+i.storeName+" (key, value) VALUES (?, ?)",[a,b],function(){f(h)},function(a,b){g(b)})},function(b){if(b.code===b.QUOTA_ERR){if(d>0)return void f(W.apply(e,[a,h,c,d-1]));g(b)}})})}).catch(g)});return h(f,c),f}function X(a,b,c){return W.apply(this,[a,b,c,1])}function Y(a,b){var c=this;a=j(a);var d=new va(function(b,d){c.ready().then(function(){var e=c._dbInfo;e.db.transaction(function(c){T(c,e,"DELETE FROM "+e.storeName+" WHERE key = ?",[a],function(){b()},function(a,b){d(b)})})}).catch(d)});return h(d,b),d}function Z(a){var b=this,c=new va(function(a,c){b.ready().then(function(){var d=b._dbInfo;d.db.transaction(function(b){T(b,d,"DELETE FROM "+d.storeName,[],function(){a()},function(a,b){c(b)})})}).catch(c)});return h(c,a),c}function $(a){var b=this,c=new va(function(a,c){b.ready().then(function(){var d=b._dbInfo;d.db.transaction(function(b){T(b,d,"SELECT COUNT(key) as c FROM "+d.storeName,[],function(b,c){var d=c.rows.item(0).c;a(d)},function(a,b){c(b)})})}).catch(c)});return h(c,a),c}function _(a,b){var c=this,d=new va(function(b,d){c.ready().then(function(){var e=c._dbInfo;e.db.transaction(function(c){T(c,e,"SELECT key FROM "+e.storeName+" WHERE id = ? LIMIT 1",[a+1],function(a,c){var d=c.rows.length?c.rows.item(0).key:null;b(d)},function(a,b){d(b)})})}).catch(d)});return h(d,b),d}function aa(a){var b=this,c=new va(function(a,c){b.ready().then(function(){var d=b._dbInfo;d.db.transaction(function(b){T(b,d,"SELECT key FROM "+d.storeName,[],function(b,c){for(var d=[],e=0;e<c.rows.length;e++)d.push(c.rows.item(e).key);a(d)},function(a,b){c(b)})})}).catch(c)});return h(c,a),c}function ba(a){return new va(function(b,c){a.transaction(function(d){d.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'",[],function(c,d){for(var e=[],f=0;f<d.rows.length;f++)e.push(d.rows.item(f).name);b({db:a,storeNames:e})},function(a,b){c(b)})},function(a){c(a)})})}function ca(a,b){b=k.apply(this,arguments);var c=this.config();a="function"!=typeof a&&a||{},a.name||(a.name=a.name||c.name,a.storeName=a.storeName||c.storeName);var d,e=this;return d=a.name?new va(function(b){var d;d=a.name===c.name?e._dbInfo.db:openDatabase(a.name,"","",0),b(a.storeName?{db:d,storeNames:[a.storeName]}:ba(d))}).then(function(a){return new va(function(b,c){a.db.transaction(function(d){function e(a){return new va(function(b,c){d.executeSql("DROP TABLE IF EXISTS "+a,[],function(){b()},function(a,b){c(b)})})}for(var f=[],g=0,h=a.storeNames.length;g<h;g++)f.push(e(a.storeNames[g]));va.all(f).then(function(){b()}).catch(function(a){c(a)})},function(a){c(a)})})}):va.reject("Invalid arguments"),h(d,b),d}function da(){try{return"undefined"!=typeof localStorage&&"setItem"in localStorage&&!!localStorage.setItem}catch(a){return!1}}function ea(a,b){var c=a.name+"/";return a.storeName!==b.storeName&&(c+=a.storeName+"/"),c}function fa(){var a="_localforage_support_test";try{return localStorage.setItem(a,!0),localStorage.removeItem(a),!1}catch(a){return!0}}function ga(){return!fa()||localStorage.length>0}function ha(a){var b=this,c={};if(a)for(var d in a)c[d]=a[d];return c.keyPrefix=ea(a,b._defaultConfig),ga()?(b._dbInfo=c,c.serializer=Va,va.resolve()):va.reject()}function ia(a){var b=this,c=b.ready().then(function(){for(var a=b._dbInfo.keyPrefix,c=localStorage.length-1;c>=0;c--){var d=localStorage.key(c);0===d.indexOf(a)&&localStorage.removeItem(d)}});return h(c,a),c}function ja(a,b){var c=this;a=j(a);var d=c.ready().then(function(){var b=c._dbInfo,d=localStorage.getItem(b.keyPrefix+a);return d&&(d=b.serializer.deserialize(d)),d});return h(d,b),d}function ka(a,b){var c=this,d=c.ready().then(function(){for(var b=c._dbInfo,d=b.keyPrefix,e=d.length,f=localStorage.length,g=1,h=0;h<f;h++){var i=localStorage.key(h);if(0===i.indexOf(d)){var j=localStorage.getItem(i);if(j&&(j=b.serializer.deserialize(j)),void 0!==(j=a(j,i.substring(e),g++)))return j}}});return h(d,b),d}function la(a,b){var c=this,d=c.ready().then(function(){var b,d=c._dbInfo;try{b=localStorage.key(a)}catch(a){b=null}return b&&(b=b.substring(d.keyPrefix.length)),b});return h(d,b),d}function ma(a){var b=this,c=b.ready().then(function(){for(var a=b._dbInfo,c=localStorage.length,d=[],e=0;e<c;e++){var f=localStorage.key(e);0===f.indexOf(a.keyPrefix)&&d.push(f.substring(a.keyPrefix.length))}return d});return h(c,a),c}function na(a){var b=this,c=b.keys().then(function(a){return a.length});return h(c,a),c}function oa(a,b){var c=this;a=j(a);var d=c.ready().then(function(){var b=c._dbInfo;localStorage.removeItem(b.keyPrefix+a)});return h(d,b),d}function pa(a,b,c){var d=this;a=j(a);var e=d.ready().then(function(){void 0===b&&(b=null);var c=b;return new va(function(e,f){var g=d._dbInfo;g.serializer.serialize(b,function(b,d){if(d)f(d);else try{localStorage.setItem(g.keyPrefix+a,b),e(c)}catch(a){"QuotaExceededError"!==a.name&&"NS_ERROR_DOM_QUOTA_REACHED"!==a.name||f(a),f(a)}})})});return h(e,c),e}function qa(a,b){if(b=k.apply(this,arguments),a="function"!=typeof a&&a||{},!a.name){var c=this.config();a.name=a.name||c.name,a.storeName=a.storeName||c.storeName}var d,e=this;return d=a.name?new va(function(b){b(a.storeName?ea(a,e._defaultConfig):a.name+"/")}).then(function(a){for(var b=localStorage.length-1;b>=0;b--){var c=localStorage.key(b);0===c.indexOf(a)&&localStorage.removeItem(c)}}):va.reject("Invalid arguments"),h(d,b),d}function ra(a,b){a[b]=function(){var c=arguments;return a.ready().then(function(){return a[b].apply(a,c)})}}function sa(){for(var a=1;a<arguments.length;a++){var b=arguments[a];if(b)for(var c in b)b.hasOwnProperty(c)&&($a(b[c])?arguments[0][c]=b[c].slice():arguments[0][c]=b[c])}return arguments[0]}var ta="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(a){return typeof a}:function(a){return a&&"function"==typeof Symbol&&a.constructor===Symbol&&a!==Symbol.prototype?"symbol":typeof a},ua=e();"undefined"==typeof Promise&&a(3);var va=Promise,wa="local-forage-detect-blob-support",xa=void 0,ya={},za=Object.prototype.toString,Aa="readonly",Ba="readwrite",Ca={_driver:"asyncStorage",_initStorage:C,_support:f(),iterate:E,getItem:D,setItem:F,removeItem:G,clear:H,length:I,key:J,keys:K,dropInstance:L},Da="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",Ea="~~local_forage_type~",Fa=/^~~local_forage_type~([^~]+)~/,Ga="__lfsc__:",Ha=Ga.length,Ia="arbf",Ja="blob",Ka="si08",La="ui08",Ma="uic8",Na="si16",Oa="si32",Pa="ur16",Qa="ui32",Ra="fl32",Sa="fl64",Ta=Ha+Ia.length,Ua=Object.prototype.toString,Va={serialize:P,deserialize:Q,stringToBuffer:N,bufferToString:O},Wa={_driver:"webSQLStorage",_initStorage:S,_support:M(),iterate:V,getItem:U,setItem:X,removeItem:Y,clear:Z,length:$,key:_,keys:aa,dropInstance:ca},Xa={_driver:"localStorageWrapper",_initStorage:ha,_support:da(),iterate:ka,getItem:ja,setItem:pa,removeItem:oa,clear:ia,length:na,key:la,keys:ma,dropInstance:qa},Ya=function(a,b){return a===b||"number"==typeof a&&"number"==typeof b&&isNaN(a)&&isNaN(b)},Za=function(a,b){for(var c=a.length,d=0;d<c;){if(Ya(a[d],b))return!0;d++}return!1},$a=Array.isArray||function(a){return"[object Array]"===Object.prototype.toString.call(a)},_a={},ab={},bb={INDEXEDDB:Ca,WEBSQL:Wa,LOCALSTORAGE:Xa},cb=[bb.INDEXEDDB._driver,bb.WEBSQL._driver,bb.LOCALSTORAGE._driver],db=["dropInstance"],eb=["clear","getItem","iterate","key","keys","length","removeItem","setItem"].concat(db),fb={description:"",driver:cb.slice(),name:"localforage",size:4980736,storeName:"keyvaluepairs",version:1},gb=function(){function a(b){d(this,a);for(var c in bb)if(bb.hasOwnProperty(c)){var e=bb[c],f=e._driver;this[c]=f,_a[f]||this.defineDriver(e)}this._defaultConfig=sa({},fb),this._config=sa({},this._defaultConfig,b),this._driverSet=null,this._initDriver=null,this._ready=!1,this._dbInfo=null,this._wrapLibraryMethodsWithReady(),this.setDriver(this._config.driver).catch(function(){})}return a.prototype.config=function(a){if("object"===(void 0===a?"undefined":ta(a))){if(this._ready)return new Error("Can't call config() after localforage has been used.");for(var b in a){if("storeName"===b&&(a[b]=a[b].replace(/\W/g,"_")),"version"===b&&"number"!=typeof a[b])return new Error("Database version must be a number.");this._config[b]=a[b]}return!("driver"in a&&a.driver)||this.setDriver(this._config.driver)}return"string"==typeof a?this._config[a]:this._config},a.prototype.defineDriver=function(a,b,c){var d=new va(function(b,c){try{var d=a._driver,e=new Error("Custom driver not compliant; see https://mozilla.github.io/localForage/#definedriver");if(!a._driver)return void c(e);for(var f=eb.concat("_initStorage"),g=0,i=f.length;g<i;g++){var j=f[g];if((!Za(db,j)||a[j])&&"function"!=typeof a[j])return void c(e)}(function(){for(var b=function(a){return function(){var b=new Error("Method "+a+" is not implemented by the current driver"),c=va.reject(b);return h(c,arguments[arguments.length-1]),c}},c=0,d=db.length;c<d;c++){var e=db[c];a[e]||(a[e]=b(e))}})();var k=function(c){_a[d]&&console.info("Redefining LocalForage driver: "+d),_a[d]=a,ab[d]=c,b()};"_support"in a?a._support&&"function"==typeof a._support?a._support().then(k,c):k(!!a._support):k(!0)}catch(a){c(a)}});return i(d,b,c),d},a.prototype.driver=function(){return this._driver||null},a.prototype.getDriver=function(a,b,c){var d=_a[a]?va.resolve(_a[a]):va.reject(new Error("Driver not found."));return i(d,b,c),d},a.prototype.getSerializer=function(a){var b=va.resolve(Va);return i(b,a),b},a.prototype.ready=function(a){var b=this,c=b._driverSet.then(function(){return null===b._ready&&(b._ready=b._initDriver()),b._ready});return i(c,a,a),c},a.prototype.setDriver=function(a,b,c){function d(){g._config.driver=g.driver()}function e(a){return g._extend(a),d(),g._ready=g._initStorage(g._config),g._ready}function f(a){return function(){function b(){for(;c<a.length;){var f=a[c];return c++,g._dbInfo=null,g._ready=null,g.getDriver(f).then(e).catch(b)}d();var h=new Error("No available storage method found.");return g._driverSet=va.reject(h),g._driverSet}var c=0;return b()}}var g=this;$a(a)||(a=[a]);var h=this._getSupportedDrivers(a),j=null!==this._driverSet?this._driverSet.catch(function(){return va.resolve()}):va.resolve();return this._driverSet=j.then(function(){var a=h[0];return g._dbInfo=null,g._ready=null,g.getDriver(a).then(function(a){g._driver=a._driver,d(),g._wrapLibraryMethodsWithReady(),g._initDriver=f(h)})}).catch(function(){d();var a=new Error("No available storage method found.");return g._driverSet=va.reject(a),g._driverSet}),i(this._driverSet,b,c),this._driverSet},a.prototype.supports=function(a){return!!ab[a]},a.prototype._extend=function(a){sa(this,a)},a.prototype._getSupportedDrivers=function(a){for(var b=[],c=0,d=a.length;c<d;c++){var e=a[c];this.supports(e)&&b.push(e)}return b},a.prototype._wrapLibraryMethodsWithReady=function(){for(var a=0,b=eb.length;a<b;a++)ra(this,eb[a])},a.prototype.createInstance=function(b){return new a(b)},a}(),hb=new gb;b.exports=hb},{3:3}]},{},[4])(4)});
/*!

JSZip v3.7.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/master/LICENSE
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}((function(){return function e(t,r,i){function n(a,o){if(!r[a]){if(!t[a]){var h="function"==typeof require&&require;if(!o&&h)return h(a,!0);if(s)return s(a,!0);var u=new Error("Cannot find module '"+a+"'");throw u.code="MODULE_NOT_FOUND",u}var l=r[a]={exports:{}};t[a][0].call(l.exports,(function(e){var r=t[a][1][e];return n(r||e)}),l,l.exports,e,t,r,i)}return r[a].exports}for(var s="function"==typeof require&&require,a=0;a<i.length;a++)n(i[a]);return n}({1:[function(e,t,r){"use strict";var i=e("./utils"),n=e("./support"),s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,a,o,h,u,l=[],f=0,d=e.length,c=d,p="string"!==i.getTypeOf(e);f<e.length;)c=d-f,p?(t=e[f++],r=f<d?e[f++]:0,n=f<d?e[f++]:0):(t=e.charCodeAt(f++),r=f<d?e.charCodeAt(f++):0,n=f<d?e.charCodeAt(f++):0),a=t>>2,o=(3&t)<<4|r>>4,h=c>1?(15&r)<<2|n>>6:64,u=c>2?63&n:64,l.push(s.charAt(a)+s.charAt(o)+s.charAt(h)+s.charAt(u));return l.join("")},r.decode=function(e){var t,r,i,a,o,h,u=0,l=0,f="data:";if(e.substr(0,f.length)===f)throw new Error("Invalid base64 input, it looks like a data url.");var d,c=3*(e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"")).length/4;if(e.charAt(e.length-1)===s.charAt(64)&&c--,e.charAt(e.length-2)===s.charAt(64)&&c--,c%1!=0)throw new Error("Invalid base64 input, bad content length.");for(d=n.uint8array?new Uint8Array(0|c):new Array(0|c);u<e.length;)t=s.indexOf(e.charAt(u++))<<2|(a=s.indexOf(e.charAt(u++)))>>4,r=(15&a)<<4|(o=s.indexOf(e.charAt(u++)))>>2,i=(3&o)<<6|(h=s.indexOf(e.charAt(u++))),d[l++]=t,64!==o&&(d[l++]=r),64!==h&&(d[l++]=i);return d}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var i=e("./external"),n=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,i,n){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=i,this.compressedContent=n}o.prototype={getContentWorker:function(){var e=new n(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",(function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")})),e},getCompressedWorker:function(){return new n(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var i=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(e){return new i("STORE compression")},uncompressWorker:function(){return new i("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var i=e("./utils");var n=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var i=0;i<8;i++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==i.getTypeOf(e)?function(e,t,r,i){var s=n,a=i+r;e^=-1;for(var o=i;o<a;o++)e=e>>>8^s[255&(e^t[o])];return-1^e}(0|t,e,e.length,0):function(e,t,r,i){var s=n,a=i+r;e^=-1;for(var o=i;o<a;o++)e=e>>>8^s[255&(e^t.charCodeAt(o))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var i=null;i="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:i}},{lie:37}],7:[function(e,t,r){"use strict";var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,n=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=i?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new n[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var e=this;this._pako.onData=function(t){e.push({data:t,meta:e.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";var i=e("../utils"),n=e("../stream/GenericWorker"),s=e("../utf8"),a=e("../crc32"),o=e("../signature"),h=function(e,t){var r,i="";for(r=0;r<t;r++)i+=String.fromCharCode(255&e),e>>>=8;return i},u=function(e,t,r,n,u,l){var f,d,c=e.file,p=e.compression,m=l!==s.utf8encode,_=i.transformTo("string",l(c.name)),g=i.transformTo("string",s.utf8encode(c.name)),b=c.comment,v=i.transformTo("string",l(b)),w=i.transformTo("string",s.utf8encode(b)),y=g.length!==c.name.length,k=w.length!==b.length,x="",S="",z="",C=c.dir,A=c.date,E={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(E.crc32=e.crc32,E.compressedSize=e.compressedSize,E.uncompressedSize=e.uncompressedSize);var I=0;t&&(I|=8),m||!y&&!k||(I|=2048);var O,B,R,T=0,D=0;C&&(T|=16),"UNIX"===u?(D=798,T|=(O=c.unixPermissions,B=C,R=O,O||(R=B?16893:33204),(65535&R)<<16)):(D=20,T|=63&(c.dosPermissions||0)),f=A.getUTCHours(),f<<=6,f|=A.getUTCMinutes(),f<<=5,f|=A.getUTCSeconds()/2,d=A.getUTCFullYear()-1980,d<<=4,d|=A.getUTCMonth()+1,d<<=5,d|=A.getUTCDate(),y&&(S=h(1,1)+h(a(_),4)+g,x+="up"+h(S.length,2)+S),k&&(z=h(1,1)+h(a(v),4)+w,x+="uc"+h(z.length,2)+z);var F="";return F+="\n\0",F+=h(I,2),F+=p.magic,F+=h(f,2),F+=h(d,2),F+=h(E.crc32,4),F+=h(E.compressedSize,4),F+=h(E.uncompressedSize,4),F+=h(_.length,2),F+=h(x.length,2),{fileRecord:o.LOCAL_FILE_HEADER+F+_+x,dirRecord:o.CENTRAL_FILE_HEADER+h(D,2)+F+h(v.length,2)+"\0\0\0\0"+h(T,4)+h(n,4)+_+x+v}},l=function(e){return o.DATA_DESCRIPTOR+h(e.crc32,4)+h(e.compressedSize,4)+h(e.uncompressedSize,4)};function f(e,t,r,i){n.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=i,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}i.inherits(f,n),f.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,i=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,n.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-i-1))/r:100}}))},f.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=u(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},f.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=u(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:l(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},f.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,s){var a=i.transformTo("string",s(n));return o.CENTRAL_DIRECTORY_END+"\0\0\0\0"+h(e,2)+h(e,2)+h(t,4)+h(r,4)+h(a.length,2)+a}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},f.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},f.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",(function(e){t.processChunk(e)})),e.on("end",(function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()})),e.on("error",(function(e){t.error(e)})),this},f.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},f.prototype.error=function(e){var t=this._sources;if(!n.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},f.prototype.lock=function(){n.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=f},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var i=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,t,r){var s=new n(t.streamFiles,r,t.platform,t.encodeFileName),a=0;try{e.forEach((function(e,r){a++;var n=function(e,t){var r=e||t,n=i[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(r.options.compression,t.compression),o=r.options.compressionOptions||t.compressionOptions||{},h=r.dir,u=r.date;r._compressWorker(n,o).withStreamInfo("file",{name:e,dir:h,date:u,comment:r.comment||"",unixPermissions:r.unixPermissions,dosPermissions:r.dosPermissions}).pipe(s)})),s.entriesCount=a}catch(e){s.error(e)}return s}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function i(){if(!(this instanceof i))return new i;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new i;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}i.prototype=e("./object"),i.prototype.loadAsync=e("./load"),i.support=e("./support"),i.defaults=e("./defaults"),i.version="3.7.1",i.loadAsync=function(e,t){return(new i).loadAsync(e,t)},i.external=e("./external"),t.exports=i},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var i=e("./utils"),n=e("./external"),s=e("./utf8"),a=e("./zipEntries"),o=e("./stream/Crc32Probe"),h=e("./nodejsUtils");function u(e){return new n.Promise((function(t,r){var i=e.decompressed.getContentWorker().pipe(new o);i.on("error",(function(e){r(e)})).on("end",(function(){i.streamInfo.crc32!==e.decompressed.crc32?r(new Error("Corrupted zip : CRC32 mismatch")):t()})).resume()}))}t.exports=function(e,t){var r=this;return t=i.extend(t||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:s.utf8decode}),h.isNode&&h.isStream(e)?n.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):i.prepareContent("the loaded zip file",e,!0,t.optimizedBinaryString,t.base64).then((async function(e){return new a(t).load(e)})).then((function(e){for(var r=e.files,i=0;i<r.length;i++)t.checkCRC32&&u(r[i]);return e})).then((function(e){for(var i=e,n=i.files,s=0;s<n.length;s++){var a=n[s];r.file(a.fileNameStr,a.decompressed,{binary:!0,optimizedBinaryString:!0,date:a.date,dir:a.dir,comment:a.fileCommentStr.length?a.fileCommentStr:null,unixPermissions:a.unixPermissions,dosPermissions:a.dosPermissions,createFolders:t.createFolders})}return i.zipComment.length&&(r.comment=i.zipComment),r}))}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var i=e("../utils"),n=e("../stream/GenericWorker");function s(e,t){n.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}i.inherits(s,n),s.prototype._bindStream=function(e){var t=this;this._stream=e,e.pause(),e.on("data",(function(e){t.push({data:e,meta:{percent:0}})})).on("error",(function(e){t.isPaused?this.generatedError=e:t.error(e)})).on("end",(function(){t.isPaused?t._upstreamEnded=!0:t.end()}))},s.prototype.pause=function(){return!!n.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",(function(e,t){n.push(e)||n._helper.pause(),r&&r(t)})).on("error",(function(e){n.emit("error",e)})).on("end",(function(){n.push(null)}))}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";var i=e("./utf8"),n=e("./utils"),s=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),o=e("./defaults"),h=e("./compressedObject"),u=e("./zipObject"),l=e("./generate"),f=e("./nodejsUtils"),d=e("./nodejs/NodejsStreamInputAdapter"),c=function(e,t,r){var i,a=n.getTypeOf(t),l=n.extend(r||{},o);l.date=l.date||new Date,null!==l.compression&&(l.compression=l.compression.toUpperCase()),"string"==typeof l.unixPermissions&&(l.unixPermissions=parseInt(l.unixPermissions,8)),l.unixPermissions&&16384&l.unixPermissions&&(l.dir=!0),l.dosPermissions&&16&l.dosPermissions&&(l.dir=!0),l.dir&&(e=m(e)),l.createFolders&&(i=p(e))&&_.call(this,i,!0);var c="string"===a&&!1===l.binary&&!1===l.base64;r&&void 0!==r.binary||(l.binary=!c),(t instanceof h&&0===t.uncompressedSize||l.dir||!t||0===t.length)&&(l.base64=!1,l.binary=!0,t="",l.compression="STORE",a="string");var g=null;g=t instanceof h||t instanceof s?t:f.isNode&&f.isStream(t)?new d(e,t):n.prepareContent(e,t,l.binary,l.optimizedBinaryString,l.base64);var b=new u(e,g,l);this.files[e]=b},p=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return t>0?e.substring(0,t):""},m=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},_=function(e,t){return t=void 0!==t?t:o.createFolders,e=m(e),this.files[e]||c.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function g(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var b={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,i;for(t in this.files)i=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,i)},filter:function(e){var t=[];return this.forEach((function(r,i){e(r,i)&&t.push(i)})),t},file:function(e,t,r){if(1===arguments.length){if(g(e)){var i=e;return this.filter((function(e,t){return!t.dir&&i.test(e)}))}var n=this.files[this.root+e];return n&&!n.dir?n:null}return e=this.root+e,c.call(this,e,t,r),this},folder:function(e){if(!e)return this;if(g(e))return this.filter((function(t,r){return r.dir&&e.test(t)}));var t=this.root+e,r=_.call(this,t),i=this.clone();return i.root=r.name,i},remove:function(e){e=this.root+e;var t=this.files[e];if(t||("/"!==e.slice(-1)&&(e+="/"),t=this.files[e]),t&&!t.dir)delete this.files[e];else for(var r=this.filter((function(t,r){return r.name.slice(0,e.length)===e})),i=0;i<r.length;i++)delete this.files[r[i].name];return this},generateInternalStream:function(e){var t,r={};try{if((r=n.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");n.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var o=r.comment||this.comment||"";t=l.generateWorker(this,r,o)}catch(e){(t=new s("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=b},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var i=e("./DataReader");function n(e){i.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(n,i),n.prototype.byteAt=function(e){return this.data[this.zero+e]},n.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),i=e.charCodeAt(2),n=e.charCodeAt(3),s=this.length-4;s>=0;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===i&&this.data[s+3]===n)return s-this.zero;return-1},n.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),i=e.charCodeAt(2),n=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&i===s[2]&&n===s[3]},n.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=n},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var i=e("../utils");function n(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}n.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(e){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return i.transformTo("string",this.readData(e))},readData:function(e){},lastIndexOfSignature:function(e){},readAndCheckSignature:function(e){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=n},{"../utils":32}],19:[function(e,t,r){"use strict";var i=e("./Uint8ArrayReader");function n(e){i.call(this,e)}e("../utils").inherits(n,i),n.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=n},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var i=e("./DataReader");function n(e){i.call(this,e)}e("../utils").inherits(n,i),n.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},n.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},n.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},n.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=n},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var i=e("./ArrayReader");function n(e){i.call(this,e)}e("../utils").inherits(n,i),n.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=n},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var i=e("../utils"),n=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=i.getTypeOf(e);return i.checkSupport(t),"string"!==t||n.uint8array?"nodebuffer"===t?new o(e):n.uint8array?new h(i.transformTo("uint8array",e)):new s(i.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER = "PK\x03\x04";r.CENTRAL_FILE_HEADER = "PK\x01\x02";r.CENTRAL_DIRECTORY_END = "PK\x05\x06";r.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";r.ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";r.DATA_DESCRIPTOR = "PK\x07\x08";},{}],24:[function(e,t,r){"use strict";var i=e("./GenericWorker"),n=e("../utils");function s(e){i.call(this,"ConvertWorker to "+e),this.destType=e}n.inherits(s,i),s.prototype.processChunk=function(e){this.push({data:n.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var i=e("./GenericWorker"),n=e("../crc32");function s(){i.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,i),s.prototype.processChunk=function(e){this.streamInfo.crc32=n(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var i=e("../utils"),n=e("./GenericWorker");function s(e){n.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}i.inherits(s,n),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}n.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var i=e("../utils"),n=e("./GenericWorker");function s(e){n.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then((function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=i.getTypeOf(e),t.isPaused||t._tickAndRepeat()}),(function(e){t.error(e)}))}i.inherits(s,n),s.prototype.cleanUp=function(){n.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,i.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(i.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t);break}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function i(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}i.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",(function(e){t.processChunk(e)})),e.on("end",(function(){t.end()})),e.on("error",(function(e){t.error(e)})),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;this.isPaused=!1;var e=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)this.extraStreamInfo.hasOwnProperty(e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=i},{}],29:[function(e,t,r){"use strict";var i=e("../utils"),n=e("./ConvertWorker"),s=e("./GenericWorker"),a=e("../base64"),o=e("../support"),h=e("../external"),u=null;if(o.nodestream)try{u=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,t){return new h.Promise((function(r,n){var s=[],o=e._internalType,h=e._outputType,u=e._mimeType;e.on("data",(function(e,r){s.push(e),t&&t(r)})).on("error",(function(e){s=[],n(e)})).on("end",(function(){try{var e=function(e,t,r){switch(e){case"blob":return i.newBlob(i.transformTo("arraybuffer",t),r);case"base64":return a.encode(t);default:return i.transformTo(e,t)}}(h,function(e,t){var r,i=0,n=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(n=new Uint8Array(s),r=0;r<t.length;r++)n.set(t[r],i),i+=t[r].length;return n;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(o,s),u);r(e)}catch(e){n(e)}s=[]})).resume()}))}function f(e,t,r){var a=t;switch(t){case"blob":case"arraybuffer":a="uint8array";break;case"base64":a="string";break}try{this._internalType=a,this._outputType=t,this._mimeType=r,i.checkSupport(a),this._worker=e.pipe(new n(a)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,(function(e){t.call(r,e.data,e.meta)})):this._worker.on(e,(function(){i.delay(t,arguments,r)})),this},resume:function(){return i.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(i.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new u(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var i=new ArrayBuffer(0);try{r.blob=0===new Blob([i],{type:"application/zip"}).size}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);n.append(i),r.blob=0===n.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,r){"use strict";for(var i=e("./utils"),n=e("./support"),s=e("./nodejsUtils"),a=e("./stream/GenericWorker"),o=new Array(256),h=0;h<256;h++)o[h]=h>=252?6:h>=248?5:h>=240?4:h>=224?3:h>=192?2:1;o[254]=o[254]=1;function u(){a.call(this,"utf-8 decode"),this.leftOver=null}function l(){a.call(this,"utf-8 encode")}r.utf8encode=function(e){return n.nodebuffer?s.newBufferFrom(e,"utf-8"):function(e){var t,r,i,s,a,o=e.length,h=0;for(s=0;s<o;s++)55296==(64512&(r=e.charCodeAt(s)))&&s+1<o&&56320==(64512&(i=e.charCodeAt(s+1)))&&(r=65536+(r-55296<<10)+(i-56320),s++),h+=r<128?1:r<2048?2:r<65536?3:4;for(t=n.uint8array?new Uint8Array(h):new Array(h),a=0,s=0;a<h;s++)55296==(64512&(r=e.charCodeAt(s)))&&s+1<o&&56320==(64512&(i=e.charCodeAt(s+1)))&&(r=65536+(r-55296<<10)+(i-56320),s++),r<128?t[a++]=r:r<2048?(t[a++]=192|r>>>6,t[a++]=128|63&r):r<65536?(t[a++]=224|r>>>12,t[a++]=128|r>>>6&63,t[a++]=128|63&r):(t[a++]=240|r>>>18,t[a++]=128|r>>>12&63,t[a++]=128|r>>>6&63,t[a++]=128|63&r);return t}(e)},r.utf8decode=function(e){return n.nodebuffer?i.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,s,a=e.length,h=new Array(2*a);for(r=0,t=0;t<a;)if((n=e[t++])<128)h[r++]=n;else if((s=o[n])>4)h[r++]=65533,t+=s-1;else{for(n&=2===s?31:3===s?15:7;s>1&&t<a;)n=n<<6|63&e[t++],s--;s>1?h[r++]=65533:n<65536?h[r++]=n:(n-=65536,h[r++]=55296|n>>10&1023,h[r++]=56320|1023&n)}return h.length!==r&&(h.subarray?h=h.subarray(0,r):h.length=r),i.applyFromCharCode(h)}(e=i.transformTo(n.uint8array?"uint8array":"array",e))},i.inherits(u,a),u.prototype.processChunk=function(e){var t=i.transformTo(n.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(n.uint8array){var s=t;(t=new Uint8Array(s.length+this.leftOver.length)).set(this.leftOver,0),t.set(s,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var a=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;r>=0&&128==(192&e[r]);)r--;return r<0||0===r?t:r+o[e[r]]>t?r:t}(t),h=t;a!==t.length&&(n.uint8array?(h=t.subarray(0,a),this.leftOver=t.subarray(a,t.length)):(h=t.slice(0,a),this.leftOver=t.slice(a,t.length))),this.push({data:r.utf8decode(h),meta:e.meta})},u.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:r.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},r.Utf8DecodeWorker=u,i.inherits(l,a),l.prototype.processChunk=function(e){this.push({data:r.utf8encode(e.data),meta:e.meta})},r.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,r){"use strict";var i=e("./support"),n=e("./base64"),s=e("./nodejsUtils"),a=e("set-immediate-shim"),o=e("./external");function h(e){return e}function u(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}r.newBlob=function(e,t){r.checkSupport("blob");try{return new Blob([e],{type:t})}catch(r){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return i.append(e),i.getBlob(t)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var l={stringifyByChunk:function(e,t,r){var i=[],n=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;n<s;)"array"===t||"nodebuffer"===t?i.push(String.fromCharCode.apply(null,e.slice(n,Math.min(n+r,s)))):i.push(String.fromCharCode.apply(null,e.subarray(n,Math.min(n+r,s)))),n+=r;return i.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return i.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return i.nodebuffer&&1===String.fromCharCode.apply(null,s.allocBuffer(1)).length}catch(e){return!1}}()}};function f(e){var t=65536,i=r.getTypeOf(e),n=!0;if("uint8array"===i?n=l.applyCanBeUsed.uint8array:"nodebuffer"===i&&(n=l.applyCanBeUsed.nodebuffer),n)for(;t>1;)try{return l.stringifyByChunk(e,i,t)}catch(e){t=Math.floor(t/2)}return l.stringifyByChar(e)}function d(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}r.applyFromCharCode=f;var c={};c.string={string:h,array:function(e){return u(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return u(e,new Uint8Array(e.length))},nodebuffer:function(e){return u(e,s.allocBuffer(e.length))}},c.array={string:f,array:h,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return s.newBufferFrom(e)}},c.arraybuffer={string:function(e){return f(new Uint8Array(e))},array:function(e){return d(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:h,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return s.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:f,array:function(e){return d(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:h,nodebuffer:function(e){return s.newBufferFrom(e)}},c.nodebuffer={string:f,array:function(e){return d(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return d(e,new Uint8Array(e.length))},nodebuffer:h},r.transformTo=function(e,t){if(t||(t=""),!e)return t;r.checkSupport(e);var i=r.getTypeOf(t);return c[i][e](t)},r.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":i.nodebuffer&&s.isBuffer(e)?"nodebuffer":i.uint8array&&e instanceof Uint8Array?"uint8array":i.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},r.checkSupport=function(e){if(!i[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},r.MAX_VALUE_16BITS=65535,r.MAX_VALUE_32BITS=-1,r.pretty=function(e){var t,r,i="";for(r=0;r<(e||"").length;r++)i+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return i},r.delay=function(e,t,r){a((function(){e.apply(r||null,t||[])}))},r.inherits=function(e,t){var r=function(){};r.prototype=t.prototype,e.prototype=new r},r.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])arguments[e].hasOwnProperty(t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},r.prepareContent=function(e,t,s,a,h){return o.Promise.resolve(t).then((function(e){return i.blob&&(e instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(e)))&&"undefined"!=typeof FileReader?new o.Promise((function(t,r){var i=new FileReader;i.onload=function(e){t(e.target.result)},i.onerror=function(e){r(e.target.error)},i.readAsArrayBuffer(e)})):e})).then((function(t){var l,f=r.getTypeOf(t);return f?("arraybuffer"===f?t=r.transformTo("uint8array",t):"string"===f&&(h?t=n.decode(t):s&&!0!==a&&(t=u(l=t,i.uint8array?new Uint8Array(l.length):new Array(l.length)))),t):o.Promise.reject(new Error("Can't read the data of '"+e+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))}))}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,"set-immediate-shim":54}],33:[function(e,t,r){"use strict";var i=e("./reader/readerFor"),n=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=(e("./utf8"),e("./support"));function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+n.pretty(t)+", expected "+n.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var i=this.reader.readString(4)===t;return this.reader.setIndex(r),i},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=n.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,i=this.zip64EndOfCentralSize-44;0<i;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),this.disksCount>1)throw new Error("Multi-volumes zip are not supported")},str_decode:function(e){return new Promise(((t,r)=>{if(0==e.length)return t("");let i=(e=>{let t=0,r=[];for(let i=0;i<e.length;i++){let n=e[i];if(n<128){if(0!=t)return"GB18030"}else if(r.push(n),t){if(t--,128!=(192&n))return"GB18030";0==t&&(r.length=0)}else if(255==n)t=6;else if(n>251)t=5;else if(n>247)t=4;else if(n>239)t=3;else if(n>223)t=2;else{if(!(n>191))return r.concat(e[i+1]),"GB18030";t=1}}return"utf-8"})(e);((e,t,r)=>{let i=new FileReader;i.onload=e=>r(i.result),i.readAsText(new Blob([e]),t)})(e,i,(e=>t(e)))}))},readLocalFiles:async function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.fileName&&(t.fileNameStr=await this.str_decode(t.fileName)),t.fileComment&&(t.fileCommentStr=await this.str_decode(t.fileComment)),t.processAttributes();return this},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===n.MAX_VALUE_16BITS||this.diskWithCentralDirStart===n.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===n.MAX_VALUE_16BITS||this.centralDirRecords===n.MAX_VALUE_16BITS||this.centralDirSize===n.MAX_VALUE_32BITS||this.centralDirOffset===n.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var i=t-r;if(i>0)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=i);else if(i<0)throw new Error("Corrupted zip: missing "+Math.abs(i)+" bytes.")},prepareReader:function(e){this.reader=i(e)},load:function(e){return this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utf8":31,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var i=e("./reader/readerFor"),n=e("./utils"),s=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(h.hasOwnProperty(t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+n.pretty(this.compressionMethod)+" unknown (inner file : "+n.transformTo("string",this.fileName)+")");this.decompressed=new s(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0===e&&(this.dosPermissions=63&this.externalFileAttributes),3===e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(e){if(this.extraFields[1]){var t=i(this.extraFields[1].value);this.uncompressedSize===n.MAX_VALUE_32BITS&&(this.uncompressedSize=t.readInt(8)),this.compressedSize===n.MAX_VALUE_32BITS&&(this.compressedSize=t.readInt(8)),this.localHeaderOffset===n.MAX_VALUE_32BITS&&(this.localHeaderOffset=t.readInt(8)),this.diskNumberStart===n.MAX_VALUE_32BITS&&(this.diskNumberStart=t.readInt(4))}},readExtraFields:function(e){var t,r,i,n=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<n;)t=e.readInt(2),r=e.readInt(2),i=e.readData(r),this.extraFields[t]={id:t,length:r,value:i};e.setIndex(n)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=n.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var i=this.findExtraFieldUnicodeComment();if(null!==i)this.fileCommentStr=i;else{var s=n.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(s)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=i(e.value);return 1!==t.readInt(1)||a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=i(e.value);return 1!==t.readInt(1)||a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";var i=e("./stream/StreamHelper"),n=e("./stream/DataWorker"),s=e("./utf8"),a=e("./compressedObject"),o=e("./stream/GenericWorker"),h=function(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}};h.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var a=!this._dataBinary;a&&!n&&(t=t.pipe(new s.Utf8EncodeWorker)),!a&&n&&(t=t.pipe(new s.Utf8DecodeWorker))}catch(e){(t=new o("error")).error(e)}return new i(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof a&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new s.Utf8EncodeWorker)),a.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof a?this._data.getContentWorker():this._data instanceof o?this._data:new n(this._data)}},t.exports=h},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,t,r){(function(e){"use strict";var r,i,n=e.MutationObserver||e.WebKitMutationObserver;if(n){var s=0,a=new n(l),o=e.document.createTextNode("");a.observe(o,{characterData:!0}),r=function(){o.data=s=++s%2}}else if(e.setImmediate||void 0===e.MessageChannel)r="document"in e&&"onreadystatechange"in e.document.createElement("script")?function(){var t=e.document.createElement("script");t.onreadystatechange=function(){l(),t.onreadystatechange=null,t.parentNode.removeChild(t),t=null},e.document.documentElement.appendChild(t)}:function(){setTimeout(l,0)};else{var h=new e.MessageChannel;h.port1.onmessage=l,r=function(){h.port2.postMessage(0)}}var u=[];function l(){var e,t;i=!0;for(var r=u.length;r;){for(t=u,u=[],e=-1;++e<r;)t[e]();r=u.length}i=!1}t.exports=function(e){1!==u.push(e)||i||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function n(){}var s={},a=["REJECTED"],o=["FULFILLED"],h=["PENDING"];function u(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=h,this.queue=[],this.outcome=void 0,e!==n&&c(this,e)}function l(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(e,t,r){i((function(){var i;try{i=t(r)}catch(t){return s.reject(e,t)}i===e?s.reject(e,new TypeError("Cannot resolve promise with itself")):s.resolve(e,i)}))}function d(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function c(e,t){var r=!1;function i(t){r||(r=!0,s.reject(e,t))}function n(t){r||(r=!0,s.resolve(e,t))}var a=p((function(){t(n,i)}));"error"===a.status&&i(a.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}t.exports=u,u.prototype.finally=function(e){if("function"!=typeof e)return this;var t=this.constructor;return this.then((function(r){return t.resolve(e()).then((function(){return r}))}),(function(r){return t.resolve(e()).then((function(){throw r}))}))},u.prototype.catch=function(e){return this.then(null,e)},u.prototype.then=function(e,t){if("function"!=typeof e&&this.state===o||"function"!=typeof t&&this.state===a)return this;var r=new this.constructor(n);this.state!==h?f(r,this.state===o?e:t,this.outcome):this.queue.push(new l(r,e,t));return r},l.prototype.callFulfilled=function(e){s.resolve(this.promise,e)},l.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},l.prototype.callRejected=function(e){s.reject(this.promise,e)},l.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},s.resolve=function(e,t){var r=p(d,t);if("error"===r.status)return s.reject(e,r.value);var i=r.value;if(i)c(e,i);else{e.state=o,e.outcome=t;for(var n=-1,a=e.queue.length;++n<a;)e.queue[n].callFulfilled(t)}return e},s.reject=function(e,t){e.state=a,e.outcome=t;for(var r=-1,i=e.queue.length;++r<i;)e.queue[r].callRejected(t);return e},u.resolve=function(e){if(e instanceof this)return e;return s.resolve(new this(n),e)},u.reject=function(e){var t=new this(n);return s.reject(t,e)},u.all=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,i=!1;if(!r)return this.resolve([]);var a=new Array(r),o=0,h=-1,u=new this(n);for(;++h<r;)l(e[h],h);return u;function l(e,n){t.resolve(e).then((function(e){a[n]=e,++o!==r||i||(i=!0,s.resolve(u,a))}),(function(e){i||(i=!0,s.reject(u,e))}))}},u.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,i=!1;if(!r)return this.resolve([]);var a=-1,o=new this(n);for(;++a<r;)h=e[a],t.resolve(h).then((function(e){i||(i=!0,s.resolve(o,e))}),(function(e){i||(i=!0,s.reject(o,e))}));var h;return o}},{immediate:36}],38:[function(e,t,r){"use strict";var i={};(0,e("./lib/utils/common").assign)(i,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=i},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var i=e("./zlib/deflate"),n=e("./utils/common"),s=e("./utils/strings"),a=e("./zlib/messages"),o=e("./zlib/zstream"),h=Object.prototype.toString;function u(e){if(!(this instanceof u))return new u(e);this.options=n.assign({level:-1,method:8,chunkSize:16384,windowBits:15,memLevel:8,strategy:0,to:""},e||{});var t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new o,this.strm.avail_out=0;var r=i.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(0!==r)throw new Error(a[r]);if(t.header&&i.deflateSetHeader(this.strm,t.header),t.dictionary){var l;if(l="string"==typeof t.dictionary?s.string2buf(t.dictionary):"[object ArrayBuffer]"===h.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,0!==(r=i.deflateSetDictionary(this.strm,l)))throw new Error(a[r]);this._dict_set=!0}}function l(e,t){var r=new u(t);if(r.push(e,!0),r.err)throw r.msg||a[r.err];return r.result}u.prototype.push=function(e,t){var r,a,o=this.strm,u=this.options.chunkSize;if(this.ended)return!1;a=t===~~t?t:!0===t?4:0,"string"==typeof e?o.input=s.string2buf(e):"[object ArrayBuffer]"===h.call(e)?o.input=new Uint8Array(e):o.input=e,o.next_in=0,o.avail_in=o.input.length;do{if(0===o.avail_out&&(o.output=new n.Buf8(u),o.next_out=0,o.avail_out=u),1!==(r=i.deflate(o,a))&&0!==r)return this.onEnd(r),this.ended=!0,!1;0!==o.avail_out&&(0!==o.avail_in||4!==a&&2!==a)||("string"===this.options.to?this.onData(s.buf2binstring(n.shrinkBuf(o.output,o.next_out))):this.onData(n.shrinkBuf(o.output,o.next_out)))}while((o.avail_in>0||0===o.avail_out)&&1!==r);return 4===a?(r=i.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,0===r):2!==a||(this.onEnd(0),o.avail_out=0,!0)},u.prototype.onData=function(e){this.chunks.push(e)},u.prototype.onEnd=function(e){0===e&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=n.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=u,r.deflate=l,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,l(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,l(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var i=e("./zlib/inflate"),n=e("./utils/common"),s=e("./utils/strings"),a=e("./zlib/constants"),o=e("./zlib/messages"),h=e("./zlib/zstream"),u=e("./zlib/gzheader"),l=Object.prototype.toString;function f(e){if(!(this instanceof f))return new f(e);this.options=n.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new h,this.strm.avail_out=0;var r=i.inflateInit2(this.strm,t.windowBits);if(r!==a.Z_OK)throw new Error(o[r]);this.header=new u,i.inflateGetHeader(this.strm,this.header)}function d(e,t){var r=new f(t);if(r.push(e,!0),r.err)throw r.msg||o[r.err];return r.result}f.prototype.push=function(e,t){var r,o,h,u,f,d,c=this.strm,p=this.options.chunkSize,m=this.options.dictionary,_=!1;if(this.ended)return!1;o=t===~~t?t:!0===t?a.Z_FINISH:a.Z_NO_FLUSH,"string"==typeof e?c.input=s.binstring2buf(e):"[object ArrayBuffer]"===l.call(e)?c.input=new Uint8Array(e):c.input=e,c.next_in=0,c.avail_in=c.input.length;do{if(0===c.avail_out&&(c.output=new n.Buf8(p),c.next_out=0,c.avail_out=p),(r=i.inflate(c,a.Z_NO_FLUSH))===a.Z_NEED_DICT&&m&&(d="string"==typeof m?s.string2buf(m):"[object ArrayBuffer]"===l.call(m)?new Uint8Array(m):m,r=i.inflateSetDictionary(this.strm,d)),r===a.Z_BUF_ERROR&&!0===_&&(r=a.Z_OK,_=!1),r!==a.Z_STREAM_END&&r!==a.Z_OK)return this.onEnd(r),this.ended=!0,!1;c.next_out&&(0!==c.avail_out&&r!==a.Z_STREAM_END&&(0!==c.avail_in||o!==a.Z_FINISH&&o!==a.Z_SYNC_FLUSH)||("string"===this.options.to?(h=s.utf8border(c.output,c.next_out),u=c.next_out-h,f=s.buf2string(c.output,h),c.next_out=u,c.avail_out=p-u,u&&n.arraySet(c.output,c.output,h,u,0),this.onData(f)):this.onData(n.shrinkBuf(c.output,c.next_out)))),0===c.avail_in&&0===c.avail_out&&(_=!0)}while((c.avail_in>0||0===c.avail_out)&&r!==a.Z_STREAM_END);return r===a.Z_STREAM_END&&(o=a.Z_FINISH),o===a.Z_FINISH?(r=i.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===a.Z_OK):o!==a.Z_SYNC_FLUSH||(this.onEnd(a.Z_OK),c.avail_out=0,!0)},f.prototype.onData=function(e){this.chunks.push(e)},f.prototype.onEnd=function(e){e===a.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=n.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=f,r.inflate=d,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,d(e,t)},r.ungzip=d},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var i in r)r.hasOwnProperty(i)&&(e[i]=r[i])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var n={arraySet:function(e,t,r,i,n){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+i),n);else for(var s=0;s<i;s++)e[n+s]=t[r+s]},flattenChunks:function(e){var t,r,i,n,s,a;for(i=0,t=0,r=e.length;t<r;t++)i+=e[t].length;for(a=new Uint8Array(i),n=0,t=0,r=e.length;t<r;t++)s=e[t],a.set(s,n),n+=s.length;return a}},s={arraySet:function(e,t,r,i,n){for(var s=0;s<i;s++)e[n+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,n)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(i)},{}],42:[function(e,t,r){"use strict";var i=e("./common"),n=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){n=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var a=new i.Buf8(256),o=0;o<256;o++)a[o]=o>=252?6:o>=248?5:o>=240?4:o>=224?3:o>=192?2:1;function h(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&n))return String.fromCharCode.apply(null,i.shrinkBuf(e,t));for(var r="",a=0;a<t;a++)r+=String.fromCharCode(e[a]);return r}a[254]=a[254]=1,r.string2buf=function(e){var t,r,n,s,a,o=e.length,h=0;for(s=0;s<o;s++)55296==(64512&(r=e.charCodeAt(s)))&&s+1<o&&56320==(64512&(n=e.charCodeAt(s+1)))&&(r=65536+(r-55296<<10)+(n-56320),s++),h+=r<128?1:r<2048?2:r<65536?3:4;for(t=new i.Buf8(h),a=0,s=0;a<h;s++)55296==(64512&(r=e.charCodeAt(s)))&&s+1<o&&56320==(64512&(n=e.charCodeAt(s+1)))&&(r=65536+(r-55296<<10)+(n-56320),s++),r<128?t[a++]=r:r<2048?(t[a++]=192|r>>>6,t[a++]=128|63&r):r<65536?(t[a++]=224|r>>>12,t[a++]=128|r>>>6&63,t[a++]=128|63&r):(t[a++]=240|r>>>18,t[a++]=128|r>>>12&63,t[a++]=128|r>>>6&63,t[a++]=128|63&r);return t},r.buf2binstring=function(e){return h(e,e.length)},r.binstring2buf=function(e){for(var t=new i.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,i,n,s,o=t||e.length,u=new Array(2*o);for(i=0,r=0;r<o;)if((n=e[r++])<128)u[i++]=n;else if((s=a[n])>4)u[i++]=65533,r+=s-1;else{for(n&=2===s?31:3===s?15:7;s>1&&r<o;)n=n<<6|63&e[r++],s--;s>1?u[i++]=65533:n<65536?u[i++]=n:(n-=65536,u[i++]=55296|n>>10&1023,u[i++]=56320|1023&n)}return h(u,i)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;r>=0&&128==(192&e[r]);)r--;return r<0||0===r?t:r+a[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,i){for(var n=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){r-=a=r>2e3?2e3:r;do{s=s+(n=n+t[i++]|0)|0}while(--a);n%=65521,s%=65521}return n|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var i=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var i=0;i<8;i++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var s=i,a=n+r;e^=-1;for(var o=n;o<a;o++)e=e>>>8^s[255&(e^t[o])];return-1^e}},{}],46:[function(e,t,r){"use strict";var i,n=e("../utils/common"),s=e("./trees"),a=e("./adler32"),o=e("./crc32"),h=e("./messages"),u=-2,l=258,f=262,d=103,c=113,p=666;function m(e,t){return e.msg=h[t],t}function _(e){return(e<<1)-(e>4?9:0)}function g(e){for(var t=e.length;--t>=0;)e[t]=0}function b(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(n.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function v(e,t){s._tr_flush_block(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,b(e.strm)}function w(e,t){e.pending_buf[e.pending++]=t}function y(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function k(e,t){var r,i,n=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-f?e.strstart-(e.w_size-f):0,u=e.window,d=e.w_mask,c=e.prev,p=e.strstart+l,m=u[s+a-1],_=u[s+a];e.prev_length>=e.good_match&&(n>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===_&&u[r+a-1]===m&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<p);if(i=l-(p-s),s=p-l,i>a){if(e.match_start=t,a=i,i>=o)break;m=u[s+a-1],_=u[s+a]}}}while((t=c[t&d])>h&&0!=--n);return a<=e.lookahead?a:e.lookahead}function x(e){var t,r,i,s,h,u,l,d,c,p,m=e.w_size;do{if(s=e.window_size-e.lookahead-e.strstart,e.strstart>=m+(m-f)){n.arraySet(e.window,e.window,m,m,0),e.match_start-=m,e.strstart-=m,e.block_start-=m,t=r=e.hash_size;do{i=e.head[--t],e.head[t]=i>=m?i-m:0}while(--r);t=r=m;do{i=e.prev[--t],e.prev[t]=i>=m?i-m:0}while(--r);s+=m}if(0===e.strm.avail_in)break;if(u=e.strm,l=e.window,d=e.strstart+e.lookahead,c=s,p=void 0,(p=u.avail_in)>c&&(p=c),r=0===p?0:(u.avail_in-=p,n.arraySet(l,u.input,u.next_in,p,d),1===u.state.wrap?u.adler=a(u.adler,l,p,d):2===u.state.wrap&&(u.adler=o(u.adler,l,p,d)),u.next_in+=p,u.total_in+=p,p),e.lookahead+=r,e.lookahead+e.insert>=3)for(h=e.strstart-e.insert,e.ins_h=e.window[h],e.ins_h=(e.ins_h<<e.hash_shift^e.window[h+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[h+3-1])&e.hash_mask,e.prev[h&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=h,h++,e.insert--,!(e.lookahead+e.insert<3)););}while(e.lookahead<f&&0!==e.strm.avail_in)}function S(e,t){for(var r,i;;){if(e.lookahead<f){if(x(e),e.lookahead<f&&0===t)return 1;if(0===e.lookahead)break}if(r=0,e.lookahead>=3&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-f&&(e.match_length=k(e,r)),e.match_length>=3)if(i=s._tr_tally(e,e.strstart-e.match_start,e.match_length-3),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=3){e.match_length--;do{e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!=--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else i=s._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(i&&(v(e,!1),0===e.strm.avail_out))return 1}return e.insert=e.strstart<2?e.strstart:2,4===t?(v(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(v(e,!1),0===e.strm.avail_out)?1:2}function z(e,t){for(var r,i,n;;){if(e.lookahead<f){if(x(e),e.lookahead<f&&0===t)return 1;if(0===e.lookahead)break}if(r=0,e.lookahead>=3&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=2,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-f&&(e.match_length=k(e,r),e.match_length<=5&&(1===e.strategy||3===e.match_length&&e.strstart-e.match_start>4096)&&(e.match_length=2)),e.prev_length>=3&&e.match_length<=e.prev_length){n=e.strstart+e.lookahead-3,i=s._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-3),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=n&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+3-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!=--e.prev_length);if(e.match_available=0,e.match_length=2,e.strstart++,i&&(v(e,!1),0===e.strm.avail_out))return 1}else if(e.match_available){if((i=s._tr_tally(e,0,e.window[e.strstart-1]))&&v(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return 1}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(i=s._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<2?e.strstart:2,4===t?(v(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(v(e,!1),0===e.strm.avail_out)?1:2}function C(e,t,r,i,n){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=i,this.func=n}function A(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=8,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new n.Buf16(1146),this.dyn_dtree=new n.Buf16(122),this.bl_tree=new n.Buf16(78),g(this.dyn_ltree),g(this.dyn_dtree),g(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new n.Buf16(16),this.heap=new n.Buf16(573),g(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new n.Buf16(573),g(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function E(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=2,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?42:c,e.adler=2===t.wrap?0:1,t.last_flush=0,s._tr_init(t),0):m(e,u)}function I(e){var t,r=E(e);return 0===r&&((t=e.state).window_size=2*t.w_size,g(t.head),t.max_lazy_match=i[t.level].max_lazy,t.good_match=i[t.level].good_length,t.nice_match=i[t.level].nice_length,t.max_chain_length=i[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=2,t.match_available=0,t.ins_h=0),r}function O(e,t,r,i,s,a){if(!e)return u;var o=1;if(-1===t&&(t=6),i<0?(o=0,i=-i):i>15&&(o=2,i-=16),s<1||s>9||8!==r||i<8||i>15||t<0||t>9||a<0||a>4)return m(e,u);8===i&&(i=9);var h=new A;return e.state=h,h.strm=e,h.wrap=o,h.gzhead=null,h.w_bits=i,h.w_size=1<<h.w_bits,h.w_mask=h.w_size-1,h.hash_bits=s+7,h.hash_size=1<<h.hash_bits,h.hash_mask=h.hash_size-1,h.hash_shift=~~((h.hash_bits+3-1)/3),h.window=new n.Buf8(2*h.w_size),h.head=new n.Buf16(h.hash_size),h.prev=new n.Buf16(h.w_size),h.lit_bufsize=1<<s+6,h.pending_buf_size=4*h.lit_bufsize,h.pending_buf=new n.Buf8(h.pending_buf_size),h.d_buf=1*h.lit_bufsize,h.l_buf=3*h.lit_bufsize,h.level=t,h.strategy=a,h.method=r,I(e)}i=[new C(0,0,0,0,(function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(x(e),0===e.lookahead&&0===t)return 1;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var i=e.block_start+r;if((0===e.strstart||e.strstart>=i)&&(e.lookahead=e.strstart-i,e.strstart=i,v(e,!1),0===e.strm.avail_out))return 1;if(e.strstart-e.block_start>=e.w_size-f&&(v(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(v(e,!0),0===e.strm.avail_out?3:4):(e.strstart>e.block_start&&(v(e,!1),e.strm.avail_out),1)})),new C(4,4,8,4,S),new C(4,5,16,8,S),new C(4,6,32,32,S),new C(4,4,16,16,z),new C(8,16,32,32,z),new C(8,16,128,128,z),new C(8,32,128,256,z),new C(32,128,258,1024,z),new C(32,258,258,4096,z)],r.deflateInit=function(e,t){return O(e,t,8,15,8,0)},r.deflateInit2=O,r.deflateReset=I,r.deflateResetKeep=E,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?u:(e.state.gzhead=t,0):u},r.deflate=function(e,t){var r,n,a,h;if(!e||!e.state||t>5||t<0)return e?m(e,u):u;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||n.status===p&&4!==t)return m(e,0===e.avail_out?-5:u);if(n.strm=e,r=n.last_flush,n.last_flush=t,42===n.status)if(2===n.wrap)e.adler=0,w(n,31),w(n,139),w(n,8),n.gzhead?(w(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),w(n,255&n.gzhead.time),w(n,n.gzhead.time>>8&255),w(n,n.gzhead.time>>16&255),w(n,n.gzhead.time>>24&255),w(n,9===n.level?2:n.strategy>=2||n.level<2?4:0),w(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(w(n,255&n.gzhead.extra.length),w(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=o(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(w(n,0),w(n,0),w(n,0),w(n,0),w(n,0),w(n,9===n.level?2:n.strategy>=2||n.level<2?4:0),w(n,3),n.status=c);else{var f=8+(n.w_bits-8<<4)<<8;f|=(n.strategy>=2||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(f|=32),f+=31-f%31,n.status=c,y(n,f),0!==n.strstart&&(y(n,e.adler>>>16),y(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(a=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>a&&(e.adler=o(e.adler,n.pending_buf,n.pending-a,a)),b(e),a=n.pending,n.pending!==n.pending_buf_size));)w(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>a&&(e.adler=o(e.adler,n.pending_buf,n.pending-a,a)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){a=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>a&&(e.adler=o(e.adler,n.pending_buf,n.pending-a,a)),b(e),a=n.pending,n.pending===n.pending_buf_size)){h=1;break}h=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,w(n,h)}while(0!==h);n.gzhead.hcrc&&n.pending>a&&(e.adler=o(e.adler,n.pending_buf,n.pending-a,a)),0===h&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){a=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>a&&(e.adler=o(e.adler,n.pending_buf,n.pending-a,a)),b(e),a=n.pending,n.pending===n.pending_buf_size)){h=1;break}h=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,w(n,h)}while(0!==h);n.gzhead.hcrc&&n.pending>a&&(e.adler=o(e.adler,n.pending_buf,n.pending-a,a)),0===h&&(n.status=d)}else n.status=d;if(n.status===d&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&b(e),n.pending+2<=n.pending_buf_size&&(w(n,255&e.adler),w(n,e.adler>>8&255),e.adler=0,n.status=c)):n.status=c),0!==n.pending){if(b(e),0===e.avail_out)return n.last_flush=-1,0}else if(0===e.avail_in&&_(t)<=_(r)&&4!==t)return m(e,-5);if(n.status===p&&0!==e.avail_in)return m(e,-5);if(0!==e.avail_in||0!==n.lookahead||0!==t&&n.status!==p){var k=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(x(e),0===e.lookahead)){if(0===t)return 1;break}if(e.match_length=0,r=s._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(v(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(v(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(v(e,!1),0===e.strm.avail_out)?1:2}(n,t):3===n.strategy?function(e,t){for(var r,i,n,a,o=e.window;;){if(e.lookahead<=l){if(x(e),e.lookahead<=l&&0===t)return 1;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=3&&e.strstart>0&&(i=o[n=e.strstart-1])===o[++n]&&i===o[++n]&&i===o[++n]){a=e.strstart+l;do{}while(i===o[++n]&&i===o[++n]&&i===o[++n]&&i===o[++n]&&i===o[++n]&&i===o[++n]&&i===o[++n]&&i===o[++n]&&n<a);e.match_length=l-(a-n),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=3?(r=s._tr_tally(e,1,e.match_length-3),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=s._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(v(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(v(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(v(e,!1),0===e.strm.avail_out)?1:2}(n,t):i[n.level].func(n,t);if(3!==k&&4!==k||(n.status=p),1===k||3===k)return 0===e.avail_out&&(n.last_flush=-1),0;if(2===k&&(1===t?s._tr_align(n):5!==t&&(s._tr_stored_block(n,0,0,!1),3===t&&(g(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),b(e),0===e.avail_out))return n.last_flush=-1,0}return 4!==t?0:n.wrap<=0?1:(2===n.wrap?(w(n,255&e.adler),w(n,e.adler>>8&255),w(n,e.adler>>16&255),w(n,e.adler>>24&255),w(n,255&e.total_in),w(n,e.total_in>>8&255),w(n,e.total_in>>16&255),w(n,e.total_in>>24&255)):(y(n,e.adler>>>16),y(n,65535&e.adler)),b(e),n.wrap>0&&(n.wrap=-n.wrap),0!==n.pending?0:1)},r.deflateEnd=function(e){var t;return e&&e.state?42!==(t=e.state.status)&&69!==t&&73!==t&&91!==t&&t!==d&&t!==c&&t!==p?m(e,u):(e.state=null,t===c?m(e,-3):0):u},r.deflateSetDictionary=function(e,t){var r,i,s,o,h,l,f,d,c=t.length;if(!e||!e.state)return u;if(2===(o=(r=e.state).wrap)||1===o&&42!==r.status||r.lookahead)return u;for(1===o&&(e.adler=a(e.adler,t,c,0)),r.wrap=0,c>=r.w_size&&(0===o&&(g(r.head),r.strstart=0,r.block_start=0,r.insert=0),d=new n.Buf8(r.w_size),n.arraySet(d,t,c-r.w_size,r.w_size,0),t=d,c=r.w_size),h=e.avail_in,l=e.next_in,f=e.input,e.avail_in=c,e.next_in=0,e.input=t,x(r);r.lookahead>=3;){i=r.strstart,s=r.lookahead-2;do{r.ins_h=(r.ins_h<<r.hash_shift^r.window[i+3-1])&r.hash_mask,r.prev[i&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=i,i++}while(--s);r.strstart=i,r.lookahead=2,x(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=2,r.match_available=0,e.next_in=l,e.input=f,e.avail_in=h,r.wrap=o,0},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,w,y,k,x,S,z,C;r=e.state,i=e.next_in,z=e.input,n=i+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,d=r.window,c=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=m[c&g];t:for(;;){if(c>>>=w=v>>>24,p-=w,0===(w=v>>>16&255))C[s++]=65535&v;else{if(!(16&w)){if(0==(64&w)){v=m[(65535&v)+(c&(1<<w)-1)];continue t}if(32&w){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}y=65535&v,(w&=15)&&(p<w&&(c+=z[i++]<<p,p+=8),y+=c&(1<<w)-1,c>>>=w,p-=w),p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=_[c&b];r:for(;;){if(c>>>=w=v>>>24,p-=w,!(16&(w=v>>>16&255))){if(0==(64&w)){v=_[(65535&v)+(c&(1<<w)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(w&=15)&&(c+=z[i++]<<p,(p+=8)<w&&(c+=z[i++]<<p,p+=8)),(k+=c&(1<<w)-1)>h){e.msg="invalid distance too far back",r.mode=30;break e}if(c>>>=w,p-=w,k>(w=s-a)){if((w=k-w)>l&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(x=0,S=d,0===f){if(x+=u-w,w<y){y-=w;do{C[s++]=d[x++]}while(--w);x=s-k,S=C}}else if(f<w){if(x+=u+f-w,(w-=f)<y){y-=w;do{C[s++]=d[x++]}while(--w);if(x=0,f<y){y-=w=f;do{C[s++]=d[x++]}while(--w);x=s-k,S=C}}}else if(x+=f-w,w<y){y-=w;do{C[s++]=d[x++]}while(--w);x=s-k,S=C}for(;y>2;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],y-=3;y&&(C[s++]=S[x++],y>1&&(C[s++]=S[x++]))}else{x=s-k;do{C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],y-=3}while(y>2);y&&(C[s++]=C[x++],y>1&&(C[s++]=C[x++]))}break}}break}}while(i<n&&s<o);i-=y=p>>3,c&=(1<<(p-=y<<3))-1,e.next_in=i,e.next_out=s,e.avail_in=i<n?n-i+5:5-(i-n),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=c,r.bits=p}},{}],49:[function(e,t,r){"use strict";var i=e("../utils/common"),n=e("./adler32"),s=e("./crc32"),a=e("./inffast"),o=e("./inftrees"),h=-2,u=12,l=30;function f(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function d(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new i.Buf16(320),this.work=new i.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function c(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=1,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new i.Buf32(852),t.distcode=t.distdyn=new i.Buf32(592),t.sane=1,t.back=-1,0):h}function p(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,c(e)):h}function m(e,t){var r,i;return e&&e.state?(i=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?h:(null!==i.window&&i.wbits!==t&&(i.window=null),i.wrap=r,i.wbits=t,p(e))):h}function _(e,t){var r,i;return e?(i=new d,e.state=i,i.window=null,0!==(r=m(e,t))&&(e.state=null),r):h}var g,b,v=!0;function w(e){if(v){var t;for(g=new i.Buf32(512),b=new i.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(o(1,e.lens,0,288,g,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;o(2,e.lens,0,32,b,0,e.work,{bits:5}),v=!1}e.lencode=g,e.lenbits=9,e.distcode=b,e.distbits=5}function y(e,t,r,n){var s,a=e.state;return null===a.window&&(a.wsize=1<<a.wbits,a.wnext=0,a.whave=0,a.window=new i.Buf8(a.wsize)),n>=a.wsize?(i.arraySet(a.window,t,r-a.wsize,a.wsize,0),a.wnext=0,a.whave=a.wsize):((s=a.wsize-a.wnext)>n&&(s=n),i.arraySet(a.window,t,r-n,s,a.wnext),(n-=s)?(i.arraySet(a.window,t,r-n,n,0),a.wnext=n,a.whave=a.wsize):(a.wnext+=s,a.wnext===a.wsize&&(a.wnext=0),a.whave<a.wsize&&(a.whave+=s))),0}r.inflateReset=p,r.inflateReset2=m,r.inflateResetKeep=c,r.inflateInit=function(e){return _(e,15)},r.inflateInit2=_,r.inflate=function(e,t){var r,d,c,p,m,_,g,b,v,k,x,S,z,C,A,E,I,O,B,R,T,D,F,N,U=0,P=new i.Buf8(4),L=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return h;(r=e.state).mode===u&&(r.mode=13),m=e.next_out,c=e.output,g=e.avail_out,p=e.next_in,d=e.input,_=e.avail_in,b=r.hold,v=r.bits,k=_,x=g,D=0;e:for(;;)switch(r.mode){case 1:if(0===r.wrap){r.mode=13;break}for(;v<16;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(2&r.wrap&&35615===b){r.check=0,P[0]=255&b,P[1]=b>>>8&255,r.check=s(r.check,P,2,0),b=0,v=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&b)<<8)+(b>>8))%31){e.msg="incorrect header check",r.mode=l;break}if(8!=(15&b)){e.msg="unknown compression method",r.mode=l;break}if(v-=4,T=8+(15&(b>>>=4)),0===r.wbits)r.wbits=T;else if(T>r.wbits){e.msg="invalid window size",r.mode=l;break}r.dmax=1<<T,e.adler=r.check=1,r.mode=512&b?10:u,b=0,v=0;break;case 2:for(;v<16;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(r.flags=b,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=l;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=l;break}r.head&&(r.head.text=b>>8&1),512&r.flags&&(P[0]=255&b,P[1]=b>>>8&255,r.check=s(r.check,P,2,0)),b=0,v=0,r.mode=3;case 3:for(;v<32;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}r.head&&(r.head.time=b),512&r.flags&&(P[0]=255&b,P[1]=b>>>8&255,P[2]=b>>>16&255,P[3]=b>>>24&255,r.check=s(r.check,P,4,0)),b=0,v=0,r.mode=4;case 4:for(;v<16;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}r.head&&(r.head.xflags=255&b,r.head.os=b>>8),512&r.flags&&(P[0]=255&b,P[1]=b>>>8&255,r.check=s(r.check,P,2,0)),b=0,v=0,r.mode=5;case 5:if(1024&r.flags){for(;v<16;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}r.length=b,r.head&&(r.head.extra_len=b),512&r.flags&&(P[0]=255&b,P[1]=b>>>8&255,r.check=s(r.check,P,2,0)),b=0,v=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&((S=r.length)>_&&(S=_),S&&(r.head&&(T=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),i.arraySet(r.head.extra,d,p,S,T)),512&r.flags&&(r.check=s(r.check,d,S,p)),_-=S,p+=S,r.length-=S),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===_)break e;S=0;do{T=d[p+S++],r.head&&T&&r.length<65536&&(r.head.name+=String.fromCharCode(T))}while(T&&S<_);if(512&r.flags&&(r.check=s(r.check,d,S,p)),_-=S,p+=S,T)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===_)break e;S=0;do{T=d[p+S++],r.head&&T&&r.length<65536&&(r.head.comment+=String.fromCharCode(T))}while(T&&S<_);if(512&r.flags&&(r.check=s(r.check,d,S,p)),_-=S,p+=S,T)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;v<16;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(b!==(65535&r.check)){e.msg="header crc mismatch",r.mode=l;break}b=0,v=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=u;break;case 10:for(;v<32;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}e.adler=r.check=f(b),b=0,v=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=m,e.avail_out=g,e.next_in=p,e.avail_in=_,r.hold=b,r.bits=v,2;e.adler=r.check=1,r.mode=u;case u:if(5===t||6===t)break e;case 13:if(r.last){b>>>=7&v,v-=7&v,r.mode=27;break}for(;v<3;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}switch(r.last=1&b,v-=1,3&(b>>>=1)){case 0:r.mode=14;break;case 1:if(w(r),r.mode=20,6===t){b>>>=2,v-=2;break e}break;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=l}b>>>=2,v-=2;break;case 14:for(b>>>=7&v,v-=7&v;v<32;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if((65535&b)!=(b>>>16^65535)){e.msg="invalid stored block lengths",r.mode=l;break}if(r.length=65535&b,b=0,v=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(S=r.length){if(S>_&&(S=_),S>g&&(S=g),0===S)break e;i.arraySet(c,d,p,S,m),_-=S,p+=S,g-=S,m+=S,r.length-=S;break}r.mode=u;break;case 17:for(;v<14;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(r.nlen=257+(31&b),b>>>=5,v-=5,r.ndist=1+(31&b),b>>>=5,v-=5,r.ncode=4+(15&b),b>>>=4,v-=4,r.nlen>286||r.ndist>30){e.msg="too many length or distance symbols",r.mode=l;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;v<3;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}r.lens[L[r.have++]]=7&b,b>>>=3,v-=3}for(;r.have<19;)r.lens[L[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,F={bits:r.lenbits},D=o(0,r.lens,0,19,r.lencode,0,r.work,F),r.lenbits=F.bits,D){e.msg="invalid code lengths set",r.mode=l;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;E=(U=r.lencode[b&(1<<r.lenbits)-1])>>>16&255,I=65535&U,!((A=U>>>24)<=v);){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(I<16)b>>>=A,v-=A,r.lens[r.have++]=I;else{if(16===I){for(N=A+2;v<N;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(b>>>=A,v-=A,0===r.have){e.msg="invalid bit length repeat",r.mode=l;break}T=r.lens[r.have-1],S=3+(3&b),b>>>=2,v-=2}else if(17===I){for(N=A+3;v<N;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}v-=A,T=0,S=3+(7&(b>>>=A)),b>>>=3,v-=3}else{for(N=A+7;v<N;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}v-=A,T=0,S=11+(127&(b>>>=A)),b>>>=7,v-=7}if(r.have+S>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=l;break}for(;S--;)r.lens[r.have++]=T}}if(r.mode===l)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=l;break}if(r.lenbits=9,F={bits:r.lenbits},D=o(1,r.lens,0,r.nlen,r.lencode,0,r.work,F),r.lenbits=F.bits,D){e.msg="invalid literal/lengths set",r.mode=l;break}if(r.distbits=6,r.distcode=r.distdyn,F={bits:r.distbits},D=o(2,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,F),r.distbits=F.bits,D){e.msg="invalid distances set",r.mode=l;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(_>=6&&g>=258){e.next_out=m,e.avail_out=g,e.next_in=p,e.avail_in=_,r.hold=b,r.bits=v,a(e,x),m=e.next_out,c=e.output,g=e.avail_out,p=e.next_in,d=e.input,_=e.avail_in,b=r.hold,v=r.bits,r.mode===u&&(r.back=-1);break}for(r.back=0;E=(U=r.lencode[b&(1<<r.lenbits)-1])>>>16&255,I=65535&U,!((A=U>>>24)<=v);){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(E&&0==(240&E)){for(O=A,B=E,R=I;E=(U=r.lencode[R+((b&(1<<O+B)-1)>>O)])>>>16&255,I=65535&U,!(O+(A=U>>>24)<=v);){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}b>>>=O,v-=O,r.back+=O}if(b>>>=A,v-=A,r.back+=A,r.length=I,0===E){r.mode=26;break}if(32&E){r.back=-1,r.mode=u;break}if(64&E){e.msg="invalid literal/length code",r.mode=l;break}r.extra=15&E,r.mode=22;case 22:if(r.extra){for(N=r.extra;v<N;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}r.length+=b&(1<<r.extra)-1,b>>>=r.extra,v-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;E=(U=r.distcode[b&(1<<r.distbits)-1])>>>16&255,I=65535&U,!((A=U>>>24)<=v);){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(0==(240&E)){for(O=A,B=E,R=I;E=(U=r.distcode[R+((b&(1<<O+B)-1)>>O)])>>>16&255,I=65535&U,!(O+(A=U>>>24)<=v);){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}b>>>=O,v-=O,r.back+=O}if(b>>>=A,v-=A,r.back+=A,64&E){e.msg="invalid distance code",r.mode=l;break}r.offset=I,r.extra=15&E,r.mode=24;case 24:if(r.extra){for(N=r.extra;v<N;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}r.offset+=b&(1<<r.extra)-1,b>>>=r.extra,v-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=l;break}r.mode=25;case 25:if(0===g)break e;if(S=x-g,r.offset>S){if((S=r.offset-S)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=l;break}S>r.wnext?(S-=r.wnext,z=r.wsize-S):z=r.wnext-S,S>r.length&&(S=r.length),C=r.window}else C=c,z=m-r.offset,S=r.length;S>g&&(S=g),g-=S,r.length-=S;do{c[m++]=C[z++]}while(--S);0===r.length&&(r.mode=21);break;case 26:if(0===g)break e;c[m++]=r.length,g--,r.mode=21;break;case 27:if(r.wrap){for(;v<32;){if(0===_)break e;_--,b|=d[p++]<<v,v+=8}if(x-=g,e.total_out+=x,r.total+=x,x&&(e.adler=r.check=r.flags?s(r.check,c,x,m-x):n(r.check,c,x,m-x)),x=g,(r.flags?b:f(b))!==r.check){e.msg="incorrect data check",r.mode=l;break}b=0,v=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;v<32;){if(0===_)break e;_--,b+=d[p++]<<v,v+=8}if(b!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=l;break}b=0,v=0}r.mode=29;case 29:D=1;break e;case l:D=-3;break e;case 31:return-4;case 32:default:return h}return e.next_out=m,e.avail_out=g,e.next_in=p,e.avail_in=_,r.hold=b,r.bits=v,(r.wsize||x!==e.avail_out&&r.mode<l&&(r.mode<27||4!==t))&&y(e,e.output,e.next_out,x-e.avail_out)?(r.mode=31,-4):(k-=e.avail_in,x-=e.avail_out,e.total_in+=k,e.total_out+=x,r.total+=x,r.wrap&&x&&(e.adler=r.check=r.flags?s(r.check,c,x,e.next_out-x):n(r.check,c,x,e.next_out-x)),e.data_type=r.bits+(r.last?64:0)+(r.mode===u?128:0)+(20===r.mode||15===r.mode?256:0),(0===k&&0===x||4===t)&&0===D&&(D=-5),D)},r.inflateEnd=function(e){if(!e||!e.state)return h;var t=e.state;return t.window&&(t.window=null),e.state=null,0},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?h:(r.head=t,t.done=!1,0):h},r.inflateSetDictionary=function(e,t){var r,i=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?h:11===r.mode&&n(1,t,i,0)!==r.check?-3:y(e,t,i,i)?(r.mode=31,-4):(r.havedict=1,0):h},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var i=e("../utils/common"),n=15,s=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],a=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],o=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],h=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,u,l,f,d,c){var p,m,_,g,b,v,w,y,k,x=c.bits,S=0,z=0,C=0,A=0,E=0,I=0,O=0,B=0,R=0,T=0,D=null,F=0,N=new i.Buf16(16),U=new i.Buf16(16),P=null,L=0;for(S=0;S<=n;S++)N[S]=0;for(z=0;z<u;z++)N[t[r+z]]++;for(E=x,A=n;A>=1&&0===N[A];A--);if(E>A&&(E=A),0===A)return l[f++]=20971520,l[f++]=20971520,c.bits=1,0;for(C=1;C<A&&0===N[C];C++);for(E<C&&(E=C),B=1,S=1;S<=n;S++)if(B<<=1,(B-=N[S])<0)return-1;if(B>0&&(0===e||1!==A))return-1;for(U[1]=0,S=1;S<n;S++)U[S+1]=U[S]+N[S];for(z=0;z<u;z++)0!==t[r+z]&&(d[U[t[r+z]]++]=z);if(0===e?(D=P=d,v=19):1===e?(D=s,F-=257,P=a,L-=257,v=256):(D=o,P=h,v=-1),T=0,z=0,S=C,b=f,I=E,O=0,_=-1,g=(R=1<<E)-1,1===e&&R>852||2===e&&R>592)return 1;for(;;){w=S-O,d[z]<v?(y=0,k=d[z]):d[z]>v?(y=P[L+d[z]],k=D[F+d[z]]):(y=96,k=0),p=1<<S-O,C=m=1<<I;do{l[b+(T>>O)+(m-=p)]=w<<24|y<<16|k|0}while(0!==m);for(p=1<<S-1;T&p;)p>>=1;if(0!==p?(T&=p-1,T+=p):T=0,z++,0==--N[S]){if(S===A)break;S=t[r+d[z]]}if(S>E&&(T&g)!==_){for(0===O&&(O=E),b+=C,B=1<<(I=S-O);I+O<A&&!((B-=N[I+O])<=0);)I++,B<<=1;if(R+=1<<I,1===e&&R>852||2===e&&R>592)return 1;l[_=T&g]=E<<24|I<<16|b-f|0}}return 0!==T&&(l[b+T]=S-O<<24|64<<16|0),c.bits=E,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common");function n(e){for(var t=e.length;--t>=0;)e[t]=0}var s=256,a=286,o=30,h=15,u=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],l=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],f=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],d=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],c=new Array(576);n(c);var p=new Array(60);n(p);var m=new Array(512);n(m);var _=new Array(256);n(_);var g=new Array(29);n(g);var b,v,w,y=new Array(o);function k(e,t,r,i,n){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=i,this.max_length=n,this.has_stree=e&&e.length}function x(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function S(e){return e<256?m[e]:m[256+(e>>>7)]}function z(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function C(e,t,r){e.bi_valid>16-r?(e.bi_buf|=t<<e.bi_valid&65535,z(e,e.bi_buf),e.bi_buf=t>>16-e.bi_valid,e.bi_valid+=r-16):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function A(e,t,r){C(e,r[2*t],r[2*t+1])}function E(e,t){var r=0;do{r|=1&e,e>>>=1,r<<=1}while(--t>0);return r>>>1}function I(e,t,r){var i,n,s=new Array(16),a=0;for(i=1;i<=h;i++)s[i]=a=a+r[i-1]<<1;for(n=0;n<=t;n++){var o=e[2*n+1];0!==o&&(e[2*n]=E(s[o]++,o))}}function O(e){var t;for(t=0;t<a;t++)e.dyn_ltree[2*t]=0;for(t=0;t<o;t++)e.dyn_dtree[2*t]=0;for(t=0;t<19;t++)e.bl_tree[2*t]=0;e.dyn_ltree[512]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function B(e){e.bi_valid>8?z(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function R(e,t,r,i){var n=2*t,s=2*r;return e[n]<e[s]||e[n]===e[s]&&i[t]<=i[r]}function T(e,t,r){for(var i=e.heap[r],n=r<<1;n<=e.heap_len&&(n<e.heap_len&&R(t,e.heap[n+1],e.heap[n],e.depth)&&n++,!R(t,i,e.heap[n],e.depth));)e.heap[r]=e.heap[n],r=n,n<<=1;e.heap[r]=i}function D(e,t,r){var i,n,a,o,h=0;if(0!==e.last_lit)do{i=e.pending_buf[e.d_buf+2*h]<<8|e.pending_buf[e.d_buf+2*h+1],n=e.pending_buf[e.l_buf+h],h++,0===i?A(e,n,t):(A(e,(a=_[n])+s+1,t),0!==(o=u[a])&&C(e,n-=g[a],o),A(e,a=S(--i),r),0!==(o=l[a])&&C(e,i-=y[a],o))}while(h<e.last_lit);A(e,256,t)}function F(e,t){var r,i,n,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,u=t.stat_desc.elems,l=-1;for(e.heap_len=0,e.heap_max=573,r=0;r<u;r++)0!==s[2*r]?(e.heap[++e.heap_len]=l=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(n=e.heap[++e.heap_len]=l<2?++l:0)]=1,e.depth[n]=0,e.opt_len--,o&&(e.static_len-=a[2*n+1]);for(t.max_code=l,r=e.heap_len>>1;r>=1;r--)T(e,s,r);n=u;do{r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],T(e,s,1),i=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=i,s[2*n]=s[2*r]+s[2*i],e.depth[n]=(e.depth[r]>=e.depth[i]?e.depth[r]:e.depth[i])+1,s[2*r+1]=s[2*i+1]=n,e.heap[1]=n++,T(e,s,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,i,n,s,a,o,u=t.dyn_tree,l=t.max_code,f=t.stat_desc.static_tree,d=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,p=t.stat_desc.extra_base,m=t.stat_desc.max_length,_=0;for(s=0;s<=h;s++)e.bl_count[s]=0;for(u[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<573;r++)(s=u[2*u[2*(i=e.heap[r])+1]+1]+1)>m&&(s=m,_++),u[2*i+1]=s,i>l||(e.bl_count[s]++,a=0,i>=p&&(a=c[i-p]),o=u[2*i],e.opt_len+=o*(s+a),d&&(e.static_len+=o*(f[2*i+1]+a)));if(0!==_){do{for(s=m-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[m]--,_-=2}while(_>0);for(s=m;0!==s;s--)for(i=e.bl_count[s];0!==i;)(n=e.heap[--r])>l||(u[2*n+1]!==s&&(e.opt_len+=(s-u[2*n+1])*u[2*n],u[2*n+1]=s),i--)}}(e,t),I(s,l,e.bl_count)}function N(e,t,r){var i,n,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,i=0;i<=r;i++)n=a,a=t[2*(i+1)+1],++o<h&&n===a||(o<u?e.bl_tree[2*n]+=o:0!==n?(n!==s&&e.bl_tree[2*n]++,e.bl_tree[32]++):o<=10?e.bl_tree[34]++:e.bl_tree[36]++,o=0,s=n,0===a?(h=138,u=3):n===a?(h=6,u=3):(h=7,u=4))}function U(e,t,r){var i,n,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),i=0;i<=r;i++)if(n=a,a=t[2*(i+1)+1],!(++o<h&&n===a)){if(o<u)do{A(e,n,e.bl_tree)}while(0!=--o);else 0!==n?(n!==s&&(A(e,n,e.bl_tree),o--),A(e,16,e.bl_tree),C(e,o-3,2)):o<=10?(A(e,17,e.bl_tree),C(e,o-3,3)):(A(e,18,e.bl_tree),C(e,o-11,7));o=0,s=n,0===a?(h=138,u=3):n===a?(h=6,u=3):(h=7,u=4)}}n(y);var P=!1;function L(e,t,r,n){C(e,0+(n?1:0),3),function(e,t,r,n){B(e),n&&(z(e,r),z(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){P||(!function(){var e,t,r,i,n,s=new Array(16);for(r=0,i=0;i<28;i++)for(g[i]=r,e=0;e<1<<u[i];e++)_[r++]=i;for(_[r-1]=i,n=0,i=0;i<16;i++)for(y[i]=n,e=0;e<1<<l[i];e++)m[n++]=i;for(n>>=7;i<o;i++)for(y[i]=n<<7,e=0;e<1<<l[i]-7;e++)m[256+n++]=i;for(t=0;t<=h;t++)s[t]=0;for(e=0;e<=143;)c[2*e+1]=8,e++,s[8]++;for(;e<=255;)c[2*e+1]=9,e++,s[9]++;for(;e<=279;)c[2*e+1]=7,e++,s[7]++;for(;e<=287;)c[2*e+1]=8,e++,s[8]++;for(I(c,287,s),e=0;e<o;e++)p[2*e+1]=5,p[2*e]=E(e,5);b=new k(c,u,257,a,h),v=new k(p,l,0,o,h),w=new k(new Array(0),f,0,19,7)}(),P=!0),e.l_desc=new x(e.dyn_ltree,b),e.d_desc=new x(e.dyn_dtree,v),e.bl_desc=new x(e.bl_tree,w),e.bi_buf=0,e.bi_valid=0,O(e)},r._tr_stored_block=L,r._tr_flush_block=function(e,t,r,i){var n,a,o=0;e.level>0?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return 0;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return 1;for(t=32;t<s;t++)if(0!==e.dyn_ltree[2*t])return 1;return 0}(e)),F(e,e.l_desc),F(e,e.d_desc),o=function(e){var t;for(N(e,e.dyn_ltree,e.l_desc.max_code),N(e,e.dyn_dtree,e.d_desc.max_code),F(e,e.bl_desc),t=18;t>=3&&0===e.bl_tree[2*d[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),n=e.opt_len+3+7>>>3,(a=e.static_len+3+7>>>3)<=n&&(n=a)):n=a=r+5,r+4<=n&&-1!==t?L(e,t,r,i):4===e.strategy||a===n?(C(e,2+(i?1:0),3),D(e,c,p)):(C(e,4+(i?1:0),3),function(e,t,r,i){var n;for(C(e,t-257,5),C(e,r-1,5),C(e,i-4,4),n=0;n<i;n++)C(e,e.bl_tree[2*d[n]+1],3);U(e,e.dyn_ltree,t-1),U(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,o+1),D(e,e.dyn_ltree,e.dyn_dtree)),O(e),i&&B(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(_[r]+s+1)]++,e.dyn_dtree[2*S(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){C(e,2,3),A(e,256,c),function(e){16===e.bi_valid?(z(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){"use strict";t.exports="function"==typeof setImmediate?setImmediate:function(){var e=[].slice.apply(arguments);e.splice(1,0,0),setTimeout.apply(null,e)}},{}]},{},[10])(10)}));
onmessage = function (e) {
	let result = e.data;
	if(Module.DATA.WORKER_STATUS[result.code]){
		return Module.DATA.WORKER_STATUS[result.code](result);
	}
}

Module.DATA.DB = localForage.createInstance({
	'name': 'NengeNet',
	'storeName': "VBA-WASM"
});

Module.DATA.getDB('gba.wasm').then(data=>{
	if(data)Module.DATA.GET_ASM(data);
	else postMessage({'code':'needwasm'});
});
