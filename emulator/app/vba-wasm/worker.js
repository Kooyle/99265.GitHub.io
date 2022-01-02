if (typeof NengeApp == 'undefined') {
    window.NengeApp = window.NengeApp || {
        MOUDULE: {}
    };
}
window.NengeApp.GBA = new class {
    SetWorker() {
        let FILE = NengeApp.FILE,
            GBAFile = FILE && FILE['gba.zip'] || null,
            JS = GBAFile ? URL.createObjectURL(new Blob([GBAFile['a.out.js']])) : "a.out.js",
            STATUS_WORKER = {
                'needwasm': (e) => {
                    let sendwasm = (b) => {
                        this.worker.postMessage({
                            'code': 'wasm',
                            'data': new Uint8Array(b)
                        });
                        b = null;
                    };
                    if (GBAFile) {
                        return sendwasm(GBAFile['a.out.wasm']);
                    } else fetch('a.out.wasm').then(a => a.arrayBuffer()).then(buf => {
                        sendwasm(buf);
                    });
                },
                'needgba': result => {
                    this.SetMsg('需要启动或者上传一个游戏!', true);
                },
                'sendStatus': result => {
                    if (result.pic && this.pic) {
                        let pic = new ImageData(new Uint8ClampedArray(result.pic), 240, 160);
                        result.pic = null;
                        this.pic.putImageData(pic, 0, 0);
                    }
                    if (result.sound) {
                        if (this.MUSIC) {
                            this.MUSIC.setBuf(result.sound);
                        }
                    }

                },
                'msg': result => {
                    this.Status = result.status;
                    this.SetMsg(result.message);

                },
                "showList": result => {
                    let HTML = '';
                    this.SetMsg("列表加载完毕!");
                    if (result.data&&result.data.length>0) {
                        for (let i = 0; i < result.data.length; i++) {
                            let file = result.data[i],
                                fileName = file.replace('game--', '游戏文件：').replace('srm--', '存档文件：');
                            if (file == 'gba.wasm') fileName = "模拟器WASM 编译文件";
                            else if (file == 'lastRunGame') fileName = "储存最后一次运行的键值：" + file;
                            HTML += '<li data-file="' + file + '">' + fileName + '<div><input type="button" value="删除" data-action="Filedel"><input type="button" value="读取" data-action="Fileread"><input type="button" value="下载" data-action="Filedown"></li></div>';
                        }
                    } else {
                        HTML = '<HR>没找到数据啊!<HR>';
                    }
                    this.Q('.gba-list-file').innerHTML = HTML;
                    this.ACTION_MAP['show-list']();
                },
                "sendFile": result => {
                    if (result.data) {
                        let link = document.createElement("a");
                        link.href = URL.createObjectURL(new Blob([result.data]));
                        result.data = null;
                        link.download = result.file.replace('game--', '').replace('srm--', '');
                        link.click();
                    }
                }
            },
            worker = new Worker(JS);
        worker.addEventListener("message", (e) => {
            let result = e.data;
            if (result && STATUS_WORKER[result.code]) {
                return STATUS_WORKER[result.code](result);
            }
        }, false);
        worker.onerror = (e) => {
            console.log(e.message, '\nline:' + e.lineno);
            this.MSG('发生错误');
            worker.terminate();
        };
        ["onunload ", "onbeforeunload "].forEach(val => {
            window.addEventListener(val, () => {
                clearTimeout(this.worker_time);
                this.worker_time = setTimeout(() => {
                    worker.terminate();
                }, 1);
            }, {
                passive: false
            });
        });
        this.worker = worker;
    }
    Upload() {
        if (!this.FileInput) {
            this.FileInput = document.createElement('input');
            this.FileInput.type = 'file';
            this.FileInput.onchange = (e) => {
                let elm = e.target,
                    file = elm.files[0];
                if (file) {
                    let reader = new FileReader();
                    reader.onload = (e) => {
                        let buf = new Uint8Array(e.target.result);
                        this.worker.postMessage({
                            code: 'sendFile',
                            data: buf,
                            name: file.name
                        }, [buf.buffer]);
                    };
                    reader.readAsArrayBuffer(file);
                }
            }
        }
        this.FileInput.click();
    }
    SetMsg(msg, bool) {
        let elm = this.Q('.gba-msg');
        elm.style.display = '';
        elm.innerHTML = msg;
        if (!bool) {
            this.TimerMsg = setTimeout(() => {
                elm.style.display = 'none';
            }, 2000);
        }
    }
    constructor(element) {
        if (element) this.body = element;
        let FileAction = (e) => {
            let elm = e.target,
                action = elm.getAttribute('data-action'),
                li = elm.parentNode.parentNode;
            let file = li.getAttribute('data-file');
            this.ACTION_MAP['close-list']();
            this.worker.postMessage({
                code: 'action',
                action,
                file
            });

        }
        this.
        ACTION_MAP = {
            "turbo": () => {
                let dom = this.Q('.vk[data-k=turbo]');
                dom.classList.toggle('vk-touched');
                this.worker.postMessage({
                    code: 'sendStatus',
                    action: 'turbo',
                    type: dom.classList.contains('vk-touched')
                });
            },
            "reset": () => {
                if (this.Status) this.worker.postMessage({
                    code: 'sendStatus',
                    action: 'reset'
                });
            },
            "music": () => {
                this.worker.postMessage({
                    code: 'sendStatus',
                    action: 'music'
                });
                this.MUSIC.state != 'closed' ? this.MUSIC.close() : this.MUSIC.open();
            },
            'upload': e => this.Upload(e),
            'showList': e => {
                this.worker.postMessage({
                    code: 'showList'
                });
            },
            'Filedown': a => FileAction(a),
            'Filedel': a => FileAction(a),
            'Fileread': a => FileAction(a),
            'close-list': a => {
                this.Q('.gba-list').style.display = 'none';
            },
            'show-list': a => {
                this.Q('.gba-list').style.display = '';
            },
            'SetKeyPad': () => {
                let padtxt = this.Q('.gba-list-pad-txt');
                padtxt.value = JSON.stringify(this.KeyGamePad, null, "\t");
                padtxt.onchange = () => {
                    let json = this.Q('.gba-list-pad-txt').value;
                    if (!json || json == "") return;
                    try {
                        this.KeyGamePad = JSON.parse(json);
                    } catch (e) {
                        this.Q('.gba-list-pad-txt').value = JSON.stringify(this.KeyGamePad, null, "\t");
                        alert('数据有问题！', e);
                    }
                }

            },
            'Keygamepad': e => {
                return e;
            },
            'KeyCode': e => {
                let map = {
                    'Escape': 'turbo',
                    'Backspace': 'reset'
                };
                this.ACTION_MAP[e] && this.ACTION_MAP[e]();
            },
            "Keyboard": e => {
                let elm = e.target;
                e.preventDefault();
                e.stopPropagation();
                if (e.code) elm.value = e.code;
            },
            "resetKey": e => {
                localStorage.removeItem('KeyboardTemp');
                this.KeyboardTemp = Array.from(this.Keyboard);
                this.ACTION_MAP['showKey']();
                this.ACTION_MAP['close-list']();
            },
            "saveKey": e => {
                let index = 0;
                let KeyMap = new Array(18).fill(0);
                this.body.querySelectorAll('.gba-list-ctrl tr').forEach(
                    tr => {
                        if (index > 0) {
                            let input = tr.querySelectorAll('td input');
                            KeyMap[index - 1] = input[0].value;
                            KeyMap[index + 9] = input[1].value;
                        }
                        index++
                    }
                );
                console.log(KeyMap);
                this.KeyboardTemp = KeyMap;
                localStorage.setItem('KeyboardTemp', KeyMap.join(','));
                this.ACTION_MAP['close-list']();
            },
            "showKey": e => {

                let HTML = '',
                    Keyboard_html = index => {
                        return `<td><input type="text" value="${this.KeyboardTemp[index]}" data-action="Keyboard"></td>`;
                    };
                for (let index = 0; index < this.keyMap.length; index++) {
                    HTML += '<tr><td>' + this.keyMap[index % 10].toLocaleUpperCase() + '</td>' + Keyboard_html(index) + '' + Keyboard_html(index + 10) + '</tr>';
                }
                this.Q('.gba-list-ctrl').innerHTML = '<h3>键位 ESC加速 Backspace重启</h3><table border="1" width="100%"><tr><th>键位</th><th>键值</th><th>键值</th></tr>' + HTML + '</table><input type="button" value="保存键值" data-action="saveKey"> | | <input type="button" value="恢复默认" data-action="resetKey"></input>';
            },
            "changeDB": (e) => {
                let elm = e.target;
                this.worker.postMessage({
                    code: 'changeDB',
                    data: elm.value
                });
                this.ACTION_MAP['close-list']();
                this.SetMsg('正在切换数据库,请稍等!<br>不要进行任何其他操作!', true);
                console.log(elm);
            }
        };
        let func = () => {
            this.initModule();
            window.removeEventListener("DOMContentLoaded", func, false);
        }
        window.addEventListener("DOMContentLoaded", func, false);
        if (document.readyState == "complete") func();
    }
    Q(str) {
        return this.body.querySelector(str);
    }
    initModule() {
        if (!this.body) {
            this.body = document.querySelector('.gba-body') || document.querySelector('#gba') || document.body;
        }
        if (!document.querySelector('.gba-body')) {
            this.body.innerHTML = this.OutPutHTML();
            this.body = document.querySelector('.gba-body');
        }
        let canvas = this.Q('.gba-pic');
        this.pic = canvas.getContext('2d');
        if ("ontouchend" in document) {
            //mobile
            this.unselect = [
                canvas,
                this.body,
                this.Q('.gba-action'),
                this.Q('.gba-ctrl'),
                this.Q('.gba-msg'),
            ];
            this.handToch();
        } else {
            this.KeyboardEvent();
        }
        this.SetWorker();
        //手柄
        this.GAMEPAD_EVENT();
    }
    GAMEPAD_EVENT() {
        let GamePadTimer,
            GAMEPAD_STATUS = {},
            GAME_PAD = () => {
                if (!this.Status) return;
                let GamePads = navigator.getGamepads(),
                    keyState = new Array(10).fill(0),
                    BtnMap = this.KeyGamePad;
                for (let GamePadId = 0; GamePadId < GamePads.length; GamePadId++) {
                    let Gamepad = GamePads[GamePadId];
                    if (Gamepad && Gamepad.connected) {
                        let AXE = Gamepad.axes,
                            Buttons = Gamepad.buttons;
                        //connected = Gamepad.connected,
                        //GamepadName = Gamepad.id;
                        for (let axeid = 0; axeid < AXE.length; axeid++) {
                            let axe = parseFloat(AXE[axeid]),
                                axeS = 0;
                            //1 左摇杆 左右 2 上下 3右摇杆 左右 上下
                            //key 4右 5左  6上 7下
                            if (axe < -0.5) axeS += 1; //1 or0
                            if (axe > 0.5) axeS += 2; //2 or 0
                            //axeS1左 上 axeS2右 下
                            //axeid%2 0左右
                            //axeid%2 1上下
                            if (axeS != 0) {
                                if (axeid % 2 == 0) {
                                    keyState[6 - axeS] = 1;
                                } else if (axeid % 2 == 1) {
                                    keyState[5 + axeS] = 1
                                }
                            }
                        }
                        for (let btnid = 0; btnid < Buttons.length; btnid++) {
                            //12上 13下 14 左 15右
                            //L1/4  R1/5  L2/6 L3/7   L/10 R11
                            //0 X 1 O 2 ▲ 3 SHARE 8 option 9 PS 16 触摸板按下17
                            //value 越大压力越强
                            if (Buttons[btnid].value > 0.5) {
                                let MapTemp = BtnMap[btnid];
                                if (MapTemp == 'turbo' || MapTemp == 'reset' || MapTemp == 'music') {
                                    if (GAMEPAD_STATUS[MapTemp]) return;
                                    //防止手柄按下 松开反复触发两次问题
                                    GAMEPAD_STATUS[MapTemp] = 1;
                                    setTimeout(() => {
                                        GAMEPAD_STATUS[MapTemp] = 0;
                                    }, 2000);
                                    this.ACTION_MAP[MapTemp]();
                                } else if (MapTemp != null) {
                                    keyState[MapTemp] = 1;
                                }

                            }
                        }
                    }
                }
                if (keyState.join(',') != this.keyState.join(',')) {
                    this.keyState = keyState;
                    this.worker.postMessage({
                        code: 'sendStatus',
                        VK: this.VK
                    });
                }
            };
        window.addEventListener("gamepadconnected", e => {
            console.log("连接手柄", e.gamepad.id);
            clearInterval(GamePadTimer);
            this.ACTION_MAP['SetKeyPad']();
            GamePadTimer = setInterval(
                () => {
                    GAME_PAD();
                },
                //1秒检查60次
                1000 / 60
            );
        });
        window.addEventListener('gamepaddisconnected', e => {
            console.log("断开手柄", e.gamepad.id);
            let GamePads = navigator.getGamepads();
            if (GamePads) {
                for (var i in GamePads) {
                    if (GamePads[i].connected) return;
                }
            }
            clearInterval(GamePadTimer);
        });
    }
    KeyboardEvent() {
        let SpKey = ['Escape', 'Backspace', 'Tab'],
            KeyboardEvent = e => {
                if (SpKey.includes(e.code)) {
                    return this.ACTION_MAP['KeyCode'](e.code);
                }
                let elm = e.target;
                if (elm) {
                    let action = elm.getAttribute('data-action');
                    if (action) return this.ACTION_MAP[action] && this.ACTION_MAP[action](e);
                    return;
                }
                if (!this.Status) return;
                let index = this.KeyboardTemp.indexOf(e.code);
                e.preventDefault();
                e.stopPropagation();
                if (index != -1) {
                    this.keyState[index % 10] = e.type == 'keyup' ? 0 : 1;
                    this.worker.postMessage({
                        code: 'sendStatus',
                        VK: this.VK
                    });
                }
                return false;
            },
            KeyboardTemp = localStorage.getItem('KeyboardTemp'),
            EventMap = ['keyup', 'keydown'];
        if (KeyboardTemp) {
            this.KeyboardTemp = KeyboardTemp.split(',');
        } else {
            this.KeyboardTemp = Array.from(this.Keyboard);
        }
        EventMap.forEach(val => document.addEventListener(val, KeyboardEvent, {
            passive: false
        }));
        this.body.addEventListener('mouseup', (e) => {
            let elm = e.target,
                action = elm.getAttribute('data-action');
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                this.ACTION_MAP[action] && this.ACTION_MAP[action](e);
            }
            return false;


        }, {
            passive: false
        });
        this.ACTION_MAP['showKey']();
    }
    get VK() {
        let ret = 0;
        for (var i = 0; i < 10; i++) {
            ret = ret | (this.keyState[i] << i);
        }
        return ret;

    }

    handToch() {
        let handleTouch = (event) => {
                let keyState = new Array(10).fill(0),
                    elm = event.target;
                if (elm) {
                    let key = elm.getAttribute('data-k'),
                        action = elm.getAttribute('data-action');
                    if (key || action) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (event.type == 'touchend') {
                            if (this.ACTION_MAP[action])this.ACTION_MAP[action](event);
                            else if (this.ACTION_MAP[key])this.ACTION_MAP[key](event);
                            return;
                        }
                    } else if (this.unselect.includes(elm)) {
                        //防止拖动
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                }
                if (event.touches && event.touches.length > 0) {
                    if (!this.Status) return;
                    for (var i = 0; i < event.touches.length; i++) {
                        var t = event.touches[i];
                        var dom = document.elementFromPoint(t.clientX, t.clientY);
                        if (dom) {
                            var k = dom.getAttribute('data-k');
                            if (!k) return
                            let index = this.keyMap.indexOf(k);
                            if (index != -1) {
                                keyState[index] = 1;
                            } else {
                                if (k == 'ul') {
                                    keyState[5] = 1;
                                    keyState[6] = 1;
                                } else if (k == 'ur') {
                                    keyState[4] = 1;
                                    keyState[6] = 1;
                                } else if (k == 'dl') {
                                    keyState[5] = 1;
                                    keyState[7] = 1;
                                } else if (k == 'dr') {
                                    keyState[4] = 1;
                                    keyState[7] = 1;
                                }
                            }
                        }
                    }
                }
                if (keyState.join(',') != this.keyState.join(',')) {
                    this.keyState = keyState;
                    this.worker.postMessage({
                        code: 'sendStatus',
                        VK: this.VK
                    });
                    return false;
                }
            }
            ['touchstart', 'touchmove', 'touchcancel', 'touchend'].forEach(
                val => document.addEventListener(val, handleTouch, {
                    passive: false
                })
            );
        ["resize", "orientationchange"].forEach(val => {
            window.addEventListener(val, (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearTimeout(this.UI_time);
                this.UI_time = setTimeout(() => {
                    this.adjustVKLayout();;
                }, 1);
                return false;
            }, {
                passive: false
            });
        });
        this.adjustVKLayout();
    }
    adjustVKLayout() {
        let gbaMaxWidth = window.innerWidth,
            gbaMaxHeight = window.innerHeight - 20,
            isLandscape = gbaMaxWidth > gbaMaxHeight,
            baseSize = Math.min(Math.min(gbaMaxWidth, gbaMaxHeight) * 0.14, 50),
            fontSize = baseSize * 0.7,
            offTop = 0,
            offLeft = 0,
            Q = str => this.Q(str),
            QS = str => this.Q('.vk[data-k="' + str + '"]'),
            makeVKStyle = (top, left, w, h, fontSize) => {
                return 'top:' + top + 'px;left:' + left + 'px;width:' + w + 'px;height:' + h + 'px;' +
                    'font-size:' + fontSize + 'px;line-height:' + h + 'px;'
            };
        if (!isLandscape) {
            offTop = Q('.gba-pic').offsetHeight + baseSize;
            if ((offTop + baseSize * 7) > gbaMaxHeight) {
                offTop = 0;
            }
        }

        var vkw = baseSize * 3;
        var vkh = baseSize;

        QS('l').style.cssText = makeVKStyle(offTop + baseSize * 1.5, 0, vkw, vkh, fontSize);
        QS('r').style.cssText = makeVKStyle(offTop + baseSize * 1.5, gbaMaxWidth - vkw, vkw, vkh,
            fontSize);

        vkh = baseSize * 0.5;
        QS('turbo').style.cssText = makeVKStyle(offTop + baseSize * 0.5, 0, vkw, vkh, fontSize);
        QS('reset').style.cssText = makeVKStyle(offTop + baseSize * 0.5, gbaMaxWidth - vkw, vkw, vkh,
            fontSize);

        vkh = baseSize;
        vkw = baseSize;
        offTop += baseSize * 3;
        offLeft = 0;
        QS('up').style.cssText = makeVKStyle(offTop, offLeft + vkw, vkw, vkh, fontSize);
        QS('ul').style.cssText = makeVKStyle(offTop, offLeft, vkw, vkh, fontSize);
        QS('ur').style.cssText = makeVKStyle(offTop, offLeft + vkw * 2, vkw, vkh, fontSize);
        QS('down').style.cssText = makeVKStyle(offTop + vkh * 2, offLeft + vkw, vkw, vkh, fontSize);
        QS('dl').style.cssText = makeVKStyle(offTop + vkh * 2, offLeft, vkw, vkh, fontSize);
        QS('dr').style.cssText = makeVKStyle(offTop + vkh * 2, offLeft + vkw * 2, vkw, vkh, fontSize);
        QS('left').style.cssText = makeVKStyle(offTop + vkh, offLeft + 0, vkw, vkh, fontSize);
        QS('right').style.cssText = makeVKStyle(offTop + vkh, offLeft + vkw * 2, vkw, vkh, fontSize);
        let abSize = vkw * 1.3;
        QS('a').style.cssText = makeVKStyle(offTop + vkh - baseSize * 0.5, gbaMaxWidth - abSize, abSize,
            abSize, fontSize);
        QS('b').style.cssText = makeVKStyle(offTop + vkh, gbaMaxWidth - abSize * 2.4, abSize, abSize,
            fontSize);

        vkh = baseSize * 0.5;
        vkw = baseSize * 3;

        offLeft = (gbaMaxWidth - vkw * 2.2) / 2;
        offTop += baseSize * 3 + baseSize * 0.5;
        if (isLandscape) {
            offTop = gbaMaxHeight - vkh;
        }

        QS('select').style.cssText = makeVKStyle(offTop, offLeft, vkw, vkh, fontSize);
        QS('start').style.cssText = makeVKStyle(offTop, offLeft + vkw * 1.2, vkw, vkh, fontSize);


    }
    MUSIC = new class {
        constructor() {

        }
        channels = 2;
        setBuf(data) {
            this.data = data;
        }
        get state() {
            if (!this.audioCtx) return 'closed';
            return this.audioCtx.state;
        }
        close() {
            this.audioCtx.close();
            this.audioCtx = null;
        }
        open() {
            let audioCtx = new(window.AudioContext || window.webkitAudioContext)({
                latencyHint: 0.0001,
                sampleRate: 48000
            });
            let scriptProcessor = audioCtx.createScriptProcessor(1024, 0, 2);
            scriptProcessor.onaudioprocess = (event) => {
                var outputBuffer = event.outputBuffer;
                var audioData0 = outputBuffer.getChannelData(0);
                var audioData1 = outputBuffer.getChannelData(1);
                if (this.data && this.data[0] && this.data[1]) {
                    for (var i = 0; i < this.data[2]; i++) {
                        audioData0[i] = this.data[0][i] / 32768.0;
                        audioData1[i] = this.data[1][i] / 32768.0;

                    }
                }
                this.data = null;

            };
            scriptProcessor.connect(audioCtx.destination);
            audioCtx.resume();
            this.audioCtx = audioCtx;
        }
    }
    Status = false;
    keyMap = ["a", "b", "select", "start", "right", "left", 'up', 'down', 'r', 'l'];
    keyState = new Array(10).fill(0);
    KeyGamePad = {
        0: 0, //※ A
        1: 1, //● B
        2: 2, //■ selete
        3: 3, //▲ start
        4: 8, //L1 LB =>L
        5: 9, //R1 RB =>R
        6: "turbo", //L2 LT 加速
        7: "reset", //R2 RT 重启
        8: null, //OPTION
        9: null, //SHARE
        10: "music", //L L3
        11: null, //R R3
        12: 6, //上
        13: 7, //下
        14: 5, //左
        15: 4, //右
        16: null, //PS键
        17: null, //触摸板按下
    };
    Keyboard = [
        "Numpad2",
        "Numpad1",
        "Numpad0",
        "NumpadDecimal",
        "ArrowRight",
        "ArrowLeft",
        "ArrowUp",
        "ArrowDown",
        "Numpad6",
        "Numpad3",
        "KeyU",
        "KeyY",
        "KeyH",
        "KeyJ",
        "KeyD",
        "KeyA",
        "KeyW",
        "KeyS",
        "KeyT",
        "KeyI",
    ];
    OutPutHTML() {
        return '<style>body{ padding: 0px; margin: 0px;} .gba-body{ width: 100%; max-width: 900px; margin: 0px auto; text-align: center; overflow: hidden; background-color: #000; position: relative; left: 0px; top: 0px; z-index: 10000; user-select: none; user-zoom: none; -moz-user-select: none; -webkit-user-drag: none; -webkit-user-select: none;} .gba-pic{ max-height: 100vh; max-width: 100vw; width: 100%; margin: 0px auto; z-index: 9999;} .gba-ctrl{ display: none; z-index: 10002;} .gba-list, .gba-msg{ position: absolute; top: 0px; left: 0px; overflow: auto; overflow-x: hidden; width: 100%; height: 100%; background-color: #ffffff4d; z-index: 10005; user-select: text; -moz-user-select: text; -webkit-user-drag: text; -webkit-user-select: text;} .gba-list-file, .gba-list-tips, .gba-list-ctrl, .gba-list-pad, .gba-db-list{ list-style: auto; font-size: 16px; margin: 5px !important; padding: 10px !important; background-color: #ffffffdc; word-break: break-all;} .gba-list-pad-txt{ width:90% !important; margin: 0px auto !important; height: 300px;} .gba-list-ctrl table td,.gba-list-ctrl table th{ text-align: center !important;} .gba-list li{ margin: 5px 0px; padding: 5px 0px; border-bottom: 2px #3fadfb solid;} .gba-list-file li>div{ display: flex; justify-content: space-between; align-items: center;} .gba-body input[data-action]{ background-image: linear-gradient(180deg, #3fadfb, #2196f3b5, #2196f3); border: 1px solid; font-size: 18px; border-radius: 5px; padding: 2px; margin: 15px 0px;} .gba-msg{ width: 300px; height: 40px; margin: auto; right: 0; bottom: 0; background-color: #08000050; color: #fff; display: block; z-index: 10004;} .gba-action{ z-index: 10004;} .vk-round{ text-align: center; vertical-align: middle; border-radius: 50%; display: inline-block;} .vk{ position: fixed; background-color: #00000014; text-align: center; overflow: hidden; font-size: 4rem; color: #FFFFFF80; position: absolute; z-index: 10003; vertical-align: middle; display: inline-block;} .vk:hover, .vk:active{ color: red;} .vk-hide{ background-color: transparent !important} .vk-touched{ background-color: rgba(255, 255, 255, 0.75);} @media screen and (max-width:600px){ .gba-ctrl{ display: block;} .gba-body{ width: 100vw; height: 100vh; position: fixed;} .gba-action{ position: absolute; right: 0px; bottom: 40px;}} @media screen and (max-height:600px){ .gba-ctrl{ display: block;} .gba-body{ width: 100vw; height: 100vh; max-width: none; position: fixed;} .gba-action{ position: absolute; right: 0px; bottom: 0px;} .gba-pic{ height: 100vh; width: auto;}} </style><div class="gba-body"><canvas class="gba-pic" width="240" height="160"></canvas><div class="gba-action"><input type="button" value="zip/gba/srm" data-action="upload"><input type="button" value="查看记录" data-action="showList"><input type="button" value="打开音乐" data-action="music"></div><div class="gba-list" style="display: none;"><h3 data-action="close-list">缓存文件列表 点击这里关闭</h3><div class="gba-db-list">这是临时更换: <input type="button" data-action="changeDB" value="DB1">| <input type="button" data-action="changeDB" value="DB2">| <input type="button" data-action="changeDB" value="DB3"><div>把需要的数据下载下来,确认无误后,删除其他数据库数据.</div></div><ul class="gba-list-file"></ul><div class="gba-list-tips">Worker 修改版，原作：<a target="_blank" href="https://github.com/44670/vba-next-wasm">https://github.com/44670/vba-next-wasm</a><br>启用RTC方法，运行蓝宝石/绿宝石，然后运行中切换回你的游戏，如火红改版。<br>RTC启用成功！ </div><div class="gba-list-ctrl"></div><div class="gba-list-pad"><h3>手柄参数,基于我的廉价PS4手柄（百元不到）</h3>12上 13下 14左 15右<br>L1/4 R1/5 R2/6 L2/7 R/10 L/11<br>//0 X 1 O 2 ▲ 3 <br>SHARE 8 option 9 PS 16 触摸板按下17<br>模拟器键值：<br>a=&gt;0,b=&gt;1,select=&gt;2,start=&gt;3,right=&gt;4,left=&gt;5,up=&gt;6,down=&gt;7,r=&gt;8,l=&gt;9 <textarea class="gba-list-pad-txt" data-action="Keygamepad"></textarea></div></div><div class="gba-msg"></div><div class="gba-ctrl"><div class="vk-rect vk" data-k="reset">重启</div><div class="vk-rect vk" data-k="turbo">加速</div><div class="vk-rect vk" data-k="l">L</div><div class="vk-rect vk" data-k="r">R</div><div class="vk-round vk" data-k="a">A</div><div class="vk-round vk" data-k="b">B</div><div class="vk-rect vk" data-k="select">Select</div><div class="vk-rect vk" data-k="start">Start</div><div class=" vk" data-k="left">←</div><div class=" vk" data-k="right">→</div><div class=" vk" data-k="up">↑</div><div class=" vk" data-k="down">↓</div><div class=" vk vk-hide" data-k="ul"></div><div class=" vk vk-hide" data-k="ur"></div><div class=" vk vk-hide" data-k="dl"></div><div class=" vk vk-hide" data-k="dr"></div></div></div>';
    }
};