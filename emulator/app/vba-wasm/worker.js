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
                            HTML += '<li data-file="' + file + '">' + fileName + '<div><input type="button" value="删除" data-action="del"><input type="button" value="读取" data-action="read"><input type="button" value="下载" data-action="down"></li></div>';
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
            'down': a => FileAction(a),
            'del': a => FileAction(a),
            'read': a => FileAction(a),
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
                            if (this.ACTION_MAP[action]) return this.ACTION_MAP[action](elm);
                            if (this.ACTION_MAP[key]) return this.ACTION_MAP[key]();
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
                val => window.addEventListener(val, handleTouch, {
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
        return;
    }
};