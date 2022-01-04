importScripts("localforage.js");
let  ___tm_current = 34916992;
var Module = new class {
	DATA = new class {
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
		DB = localforage.createInstance({'name': 'NengeNet','storeName': "VBA-WASM"});
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
			this.frames = frames;
			this.copySize = parseInt(copySize);
		}
		Img(ptr) {
			this.picptr = ptr;
		}
		FrameCheck() {
			let state = this.ASM_SAVE_STATE();
			//console.log(state)
			if ((this.lastCheckedSaveState == 1) && (state == 0)) {
				this.SAVE_SRM_DB();
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
			if (this.SoundActive) {
				data.sound = [
					this.audioData0,
					this.audioData1,
					this.copySize,
				];
				data.frames = this.frames
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
				"wasm": (e) => this.GET_ASM(e),
				"sendgba": (e) => this.LOADGAME(e.data, e.name),
				"sendSav": (e) => this.LOADSAVE(e.data),
				'sendStatus': (result) => {
					let action = result.action;
					if (action) {
						if (action == 'reset') this.ASM_RESET();
						else if (action == 'turbo') this.OpenTurbo(result.type);
						else if (action == 'music') this.OpenMusic();
					}
					if (this) {
						if (typeof result.VK != 'undefined') {
							this.VK = result.VK;
						}
					}
				},
				"nextFrame": () => odule.DATA.FrameFuc(),
				"sendFile": result => {
					if (!result || !result.data) return;
					this.LOAD_FILE.apply(this,result);
					result = null;
				},
				"showList": result => {
					this.DB_ALL(list => {
						postMessage({
							'code': 'showList',
							data: list
						});
					});
				},
				"action": result => {
					let action = result.action,
						file = result.file;
					if (action == 'Fileread') {
						if (file == 'lastRunGame') return this.MSG('这不是文件');
						else if (file == 'gba.wasm') return this.MSG('这不是文件');
						else if (file.indexOf('game--') == 0 || file.search(/\.gba$/i) != -1) this.LOADGAME(null, file);
						else if (file.indexOf('srm--') == 0 || file.search(/\.srm$/i) != -1) this.LOADSAVE(null, file);
						else if (file.indexOf('game-') == 0) {
							this.getDB(file).then(data => {
								if (data) {
									this.LOADGAME(data, file.replace('game-', ''));
								}
							});

						} else if (file.indexOf('save-') == 0) {
							this.getDB(file).then(data => {
								if (data) {
									this.LOADSAVE(data, file.replace('save-', ''));
								}
							});

						}
					} else if (action == 'Filedel') {
						this.MSG(file + ',删除后会再次返回列表!');
						this.removeDB(file).then(
							result => {
								this.WORKER_STATUS['showList']();
							}
						);
					} else if (action == 'Filedown') {
						if (file == 'lastRunGame') return this.MSG('这不是文件');
						this.getDB(file).then(data => {
							postMessage({
								code: 'sendFile',
								data,
								file
							});
						});
					}
				},
				"changeDB": result => {
					let DB = result.data;
					if (DB == 'DB1') {
						this.DB = localforage;
					} else if (DB == 'DB2') {
						this.DB = localforage.createInstance({
							'name': 'NengeApp',
							'storeName': "VBA-WASM"
						});
					} else if (DB == 'DB3') {
						this.DB = localforage.createInstance({
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
			//this.wasmSaveBuf = Module.HEAPU8.subarray(this.ptr, this.ptr + this.wasmSaveBufLen);
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
		LOADGAME(u8, GameName) {
			let loadGame = Buf => {
				if (!Buf) return postMessage({
					'code': 'needgba'
				});
				Module.HEAPU8.set(Buf, this.romBuffer);
				this.ASM_ROOM_Length(Buf.length);
				if (this.lastGameName != this.GameName) this.setDB('lastRunGame', this.GameName);
				Buf = null;
				this.LOADSAVE();
			};
			if (!u8 && !GameName) {
				this.getDB("lastRunGame").then(lastGameName => {
					if (!lastGameName) return loadGame();
					this.lastGameName = lastGameName;
					this.GameName = lastGameName;
					this.getDB(lastGameName).then(data => loadGame(data));
				});
			} else if (u8) {
				if (!u8) loadGame();
				let gameBuf = this.GETU8(u8);
				u8 = null;
				if (!GameName) {
					GameName = '未命名游戏';
					for (var i = 0xAC; i < 0xB2; i++) {
						GameName += String.fromCharCode(u8[i]);
					}
				}
				this.GameName = 'game--' + GameName;
				this.setDB(this.GameName, gameBuf).then(result => {
					loadGame(gameBuf);
				});
			} else if (GameName) {
				this.getDB(GameName).then(data => {
					this.GameName = GameName
					loadGame(data);
				});
			}
		}
		LOADSAVE(result, SrmName) {
			let loadSrm = (data) => {
				let msg;
				if (data) {
					msg = '存档读取成功！';
					this.SAVE_DATA = data;
					data = null;
					result = null;
				} else msg = '游戏已加载,但没找到存档!';
				this.lastCheckedSaveState = 0;
				this.ASM_SAVE_STATE();
				this.ASM_RESET();
				this.isRunning = true;
				this.MSG(msg);

			}
			if (this.GameName) {
				if (result) {
					this.MSG('你覆盖了存档<br>但是并没有储存！<br>需要游戏中储存。');
					return loadSrm(result);
				} else if (!SrmName) {
					SrmName = this.GET_SRM_NAME();
				}
				this.getDB(SrmName).then(data => loadSrm(data));
			} else if (SrmName && result) {
				this.MSG('游戏没有运行！<br>所以储存了：' + GameName);
				this.setDB(this.GET_SRM_NAME(GameName), result);
			}
		}
		LOAD_FILE_HEAD = {
			"7F0000EA":(u8, GameName, isZIP)=>{
				//gba
				if (isZIP) {
					return this.setDB('game--' + GameName, u8);
				}
				this.MSG('上传了一个:' + GameName);
				this.LOADGAME(u8, GameName);
			},
			"504B0304":(u8, GameName, isZIP)=>{
				//zip
				if(typeof self.JSZip == 'undefined')importScripts("JSZip.js");
				self.JSZip.loadAsync(u8).then(ZipFile => {
					let READ_ZIP = file => {
						ZipFile.file(file).async("uint8array").then(u8 => {
							this.LOAD_FILE(u8, file, true);
						});
					};
					let files = [];
					for (let File in ZipFile.files) {
						if(ZipFile.files[File].dir) continue;
						READ_ZIP(File);
						files.push(File);
					}
					this.MSG('你上传了一个压缩文件.含有：<br>' + files.join('<br>'));
				});
			},
			"52617221":(u8, GameName, isZIP,password)=>{
				//rar
				let worker = new Worker("libunrar.js");
				worker.onmessage = (e) => {
					if(e.data&&e.data.ls){
						let files = e.data.ls,fileArr=[];
						for(let FileID in files){
							let file = files[FileID];
							if(file.type=="file"){
								this.LOAD_FILE(file.fileContent,FileID,true);
								fileArr.push(FileID);
							}
						}
						this.MSG('你上传了一个压缩文件.含有：<br>' + fileArr.join('<br>'));
					}
					worker.terminate();
					worker = null;
				};
				worker.onerror = e=>{
					worker.terminate();
					worker = null;
				};
				worker.postMessage({"data":[{"name":GameName,"content":u8}],password});
			},
			"377ABCAF":(u8, GameName, isZIP)=>{
				//7z
				let worker = new Worker("extract7z.min.js"),password=GameName.split('-pass-')[1]||"";
				worker.addEventListener("message", (e) => {
					let t = e.data.t,fileData = e.data.data;
					if(fileData){
						let fileData = e.data;
						this.LOAD_FILE(fileData.data,fileData.file,true);
						this.MSG(GameName+'里面解压了：' + fileData.file);
					}else if(t==1){
						worker.terminate();
						worker = null;
					}
				});
				worker.postMessage(u8);

			},
			"SRM":(u8, GameName, isZIP)=>{
				if(isZIP)this.setDB(this.GET_SRM_NAME(GameName),u8);
				else this.LOADSAVE(u8, GameName);;
			},
			"default":(u8, GameName, isZIP)=>{
				this.setDB(GameName, u8).then(e => {
					this.MSG(GameName + '<br>是非(游戏|存档)文件<br>但也替你保存下来了！');
				});
			}
		}
		LOAD_FILE(u8, GameName, isZIP,password) {
			if (!u8) return;
			u8 = new Uint8Array(u8);
			let HEAD = (Array.from(u8.subarray(0,4)).map(item=>{return (item<16?'0':'')+item.toString(16);})).join("").toUpperCase();
			//return console.log(HEAD);
			if(this.LOAD_FILE_HEAD[HEAD])return this.LOAD_FILE_HEAD[HEAD].apply(this,arguments);
			else if(u8[0xB2] == 0x96) return  this.LOAD_FILE_HEAD["7F0000EA"].apply(this,arguments);
			else if(GameName){
				if (GameName.search(/\.srm/i) != -1 || u8.length == 139264) return  this.LOAD_FILE_HEAD["SRM"].apply(this,arguments);
				else  return  this.LOAD_FILE_HEAD["default"].apply(this,arguments);
			}
		}
		get SAVE_DATA() {
			return Module.HEAPU8.subarray(this.ptr, this.ptr + this.wasmSaveBufLen);
		}
		set SAVE_DATA(buf) {
			if (buf) return Module.HEAPU8.subarray(this.ptr, this.ptr + this.wasmSaveBufLen).set(this.GETU8(buf));
		}
		SAVE_SRM_DB() {
			this.setDB(this.GET_SRM_NAME(), this.GETU8(this.SAVE_DATA)).then(() => {
				this.MSG('存档文件已经记录！');
			});
		}
		ASM_SAVE_STATE() {
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
		ASM_Frame(VK) {
			//控制动画 下一帧 VK是控制输入
			return Module["asm"]["k"](VK);
		}
		//var DYNAMIC_BASE = 40160016,
		//DYNAMICTOP_PTR = 34916976;
		ASM_GET_Buffer(int) {
			//0存档数据开始位置399024 + 139264 => 538288
			//1 游戏数据填充位置 34777088=>68331520
			//游戏长度 33554432

			return Module["asm"]["j"](int || 0);
		}
		ASM_main() {
			return Module["asm"]["m"]();
		}
		ASM_MALLOC() {
			//返回一个随机值
			return Module["asm"]["g"]();
		}
		ASM_WASM_CALL_CTORS() {
			//会崩溃
			return Module["asm"]["f"]();
		}
		ASM_address_read(address) {
			return Module["asm"]["n"](address);
		}
		ASM_address_write(address, value) {
			return Module["asm"]["n"](address, value);
		}
		ASM_GET_tzname() {
			return Module["asm"]["q"]();
		}
		ASM_GET_daylight() {
			return Module["asm"]["r"](address, value);
		}
		ASM_GET_timezone() {
			return Module["asm"]["s"](address, value);
		}
		ASM_GET_dynCall_v() {
			return Module["asm"]["t"](address, value);
		}
		ASM_GET_dynCall_vi() {
			return Module["asm"]["u"](address, value);
		}
		GET_SRM_NAME(GameName) {
			if (!GameName) {
				GameName = this.GameName;
			} else if (GameName.indexOf('game--') != 0) GameName = 'game--' + GameName;
			return GameName.replace('game--', 'srm--').replace(/\.gba$/i,'.srm');
		}
		async getDB(name) {
			return await this.DB.getItem(name);
		}
		async setDB(name, value) {
			return await this.DB.setItem(name, value);
		}
		async DB_ALL(cb) {
			return await this.DB.keys().then(list => cb(list))
		}
		async removeDB(FILE) {
			return await this.DB.removeItem(FILE);
		}
		GET_ASM(result) {
			if (!result) return;
			let buf;
			if (result.data) {
				buf = new Uint8Array(result.data);
				this.setDB('gba.wasm', buf);
				result.data = null;
				result = null;
			} else {
				buf = result;
			}
			WebAssembly.instantiate(buf, {
				a: Module.asmLibraryArg
			}).then(result => {
				buf = null;
				Module.ASM = result.instance.exports;
				Module["_main"]();
			}).catch(e => {
				this.MSG('wasm加载失败！');
			});
		}
		MSG(msg) {
			return postMessage({
				code: 'msg',
				message: msg,
				status: this.isRunning
			});
		}
	};
	constructor() {
		let WASM_PAGE_SIZE = 65536,
			DYNAMIC_BASE = 40160016,
			DYNAMICTOP_PTR = 34916976,
			INITIAL_INITIAL_MEMORY = 41943040;
		this.asmLibraryArg = {
			"a": (code, sigPtr, argbuf) => {
				let args = readAsmConstArgs(sigPtr, argbuf);
				return this[code](args);
			},
			"d": (dest, src, num) => {
				this.HEAPU8.copyWithin(dest, src, src + num)
			},
			"e": (requestedSize) => {
				requestedSize = requestedSize >>> 0;
				console.log(requestedSize);
			},
			"b": time => _localtime_r(time, ___tm_current),
			"memory": new WebAssembly.Memory({
				"initial": INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE,
				"maximum": INITIAL_INITIAL_MEMORY / WASM_PAGE_SIZE
			}),
			"table": new WebAssembly.Table({
				"initial": 743,
				"maximum": 743 + 0,
				"element": "anyfunc"
			}),
			"c": (ptr)=>{
				let HEAP32 = this["HEAP32"];
				var ret = Date.now() / 1e3 | 0;
				if (ptr) {
					HEAP32[ptr >> 2] = ret
				}
				return ret
			}
		};
		let buffer = this.asmLibraryArg["memory"].buffer;
		INITIAL_INITIAL_MEMORY = buffer.byteLength;
		this.HEAP8 = new Int8Array(buffer);
		//this.HEAP16 = new Int16Array(buffer);
		this.HEAP32 = new Int32Array(buffer);
		this.HEAPU8 = new Uint8Array(buffer);
		//this.HEAPU16 = new Uint16Array(buffer);
		//this.HEAPU32 = new Uint32Array(buffer);
		//this.HEAPF32 = new Float32Array(buffer);
		this.HEAPF64 = new Float64Array(buffer);
		this.HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
		this.preloadedImages = {};
		this.preloadedAudios = {};
		this.DATA.getDB('gba.wasm').then(data=>{
			if(data)this.DATA.GET_ASM(data);
			else postMessage({'code':'needwasm'});
		});
	}
	/**
	 * @param {{ [x: string]: any; }} asm
	 */
	set ASM(asm) {
		this.___wasm_call_ctors = asm["f"];
		this._malloc = asm["g"];
		this._loadRom = asm["h"];
		this._updateSaveBufState = asm["i"];
		this._getBuffer = asm["j"];
		this._runFrame = asm["k"];
		this._resetCpu = asm["l"];
		this._main = asm["m"];
		this._readU32 = asm["n"];
		this._writeU32 = asm["o"];
		this._realloc = asm["p"];
		this.__get_tzname = asm["q"];
		this.__get_daylight = asm["r"];
		this.__get_timezone = asm["s"];
		this.dynCall_v = asm["t"];
		this.dynCall_vi = asm["u"];
		this.asm = asm;
		this.asmLibraryArg = null;
	}
	"1024" = arg => this.DATA.Img.apply(this.DATA, arg);
	"1045" = arg => this.DATA.sound.apply(this.DATA, arg);
	"1072" = arg => this.DATA.Module_READY.apply(this.DATA, arg);
};
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
	let HEAPU8 = Module["HEAPU8"];
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
	if (ret) stringToUTF8Array(str, Module["HEAP8"], ret, size);
	return ret
}
var ___tm_timezone = (stringToUTF8("GMT", 34917040, 4), 34917040);

function _tzset() {
	if (_tzset.called) return;
	_tzset.called = true;
	let HEAP32 = Module["HEAP32"];
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
	let HEAP32 = Module["HEAP32"];
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
var __readAsmConstArgsArray = [];

function readAsmConstArgs(sigPtr, buf) {
	let HEAPU8 = Module["HEAPU8"],
		HEAP32 = Module["HEAP32"],
		HEAPF64 = Module["HEAPF64"];
	__readAsmConstArgsArray.length = 0;
	var ch;
	buf >>= 2;
	while (ch = HEAPU8[sigPtr++]) {
		__readAsmConstArgsArray.push(ch < 105 ? HEAPF64[++buf >> 1] : HEAP32[buf]);
		++buf
	}
	return __readAsmConstArgsArray
}
onmessage = function (e) {
	let result = e.data;
	if(Module.DATA.WORKER_STATUS[result.code]){
		return Module.DATA.WORKER_STATUS[result.code](result);
	}
}