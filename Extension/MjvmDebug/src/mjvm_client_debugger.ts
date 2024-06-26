
import {
    StackFrame, Source
} from '@vscode/debugadapter';
import * as vscode from 'vscode';
import * as net from 'net';
import { clear } from 'console';
import path = require('path');
import { Semaphore } from './mjvm_semaphone'
import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugLineInfo } from './class_loader/mjvm_debug_line_info'

export class MjvmClientDebugger {
    private readonly client: net.Socket;
    private static readonly DBG_READ_STATUS: number = 0;
    private static readonly DBG_READ_STACK_TRACE: number = 1;
    private static readonly DBG_ADD_BKP: number = 2;
    private static readonly DBG_REMOVE_BKP: number = 3;
    private static readonly DBG_REMOVE_ALL_BKP: number = 4;
    private static readonly DBG_RUN: number = 5;
    private static readonly DBG_STOP: number = 6;
    private static readonly DBG_SINGLE_STEP: number = 7;
    private static readonly DBG_READ_VARIABLE: number = 8;
    private static readonly DBG_WRITE_VARIABLE: number = 9;

    private static readonly DBG_STATUS_STOP: number = 0x01;
    private static readonly DBG_STATUS_HIT_BKP: number = 0x02;
    private static readonly DBG_STATUS_SINGLE_STEP: number = 0x04;

    private static TCP_RECEIVED_TIMEOUT: number = 100;

    private requestStatusTask?: NodeJS.Timeout;

    private currentStatus: number = 0x03;
    private currentStackFrames?: StackFrame[];
    private currentBreakpoints: DebugLineInfo[] = [];

    private tcpSemaphore = new Semaphore(1);

    private hitBkpCallback?: () => void;
    private errorCallback?: () => void;
    private closeCallback?: () => void;
    private receivedCallback?: (data: Buffer) => void;

    public constructor() {
        this.client = new net.Socket();

        this.requestStatusTask = undefined;

        this.client.on('connect', () => {
            this.requestStatusTask = setInterval(() => {
                if(!this.client.destroyed && this.client.connecting === false) {
                    this.sendCmd(Buffer.from([MjvmClientDebugger.DBG_READ_STATUS])).then((data) => {
                        if(data && data[0] === MjvmClientDebugger.DBG_READ_STATUS && data[1] === 0) {
                            const tmp = this.currentStatus;
                            this.currentStatus = data[2];
                            if((tmp & MjvmClientDebugger.DBG_STATUS_HIT_BKP) !== (data[2] & MjvmClientDebugger.DBG_STATUS_HIT_BKP)) {
                                if(this.hitBkpCallback && (data[2] & MjvmClientDebugger.DBG_STATUS_HIT_BKP))
                                    this.hitBkpCallback();
                            }
                            if((tmp & MjvmClientDebugger.DBG_STATUS_STOP) != (data[2] & MjvmClientDebugger.DBG_STATUS_STOP))
                                this.currentStackFrames = undefined;
                        }
                    });
                }
            }, 100);
        });

        this.client.on('data', (data: Buffer) => {
            if(this.receivedCallback) {
                this.receivedCallback(data);
                this.receivedCallback = undefined;
            }
        });

        this.client.on('error', (err) => {
            if(this.errorCallback)
                this.errorCallback();
        });

        this.client.on('close', () => {
            if(this.closeCallback) {
                if(this.requestStatusTask) {
                    clearInterval(this.requestStatusTask);
                    this.requestStatusTask = undefined;
                }
                this.closeCallback();
            }
        });
    }

    private onReceived(callback: (data: Buffer) => void) {
        this.receivedCallback = callback;
    }

    public onHitBkp(callback: () => void) {
        this.hitBkpCallback = callback;
    }

    public onError(callback: () => void) {
        this.errorCallback = callback;
    }

    public onClose(callback: () => void) {
        this.closeCallback = callback;
    }

    public async connect() {
        await this.client.connect(5555, '127.0.0.1');
    }

    private sendCmd(data: Buffer) : Thenable<Buffer | null> {
        return new Promise((resolve) => {
            this.tcpSemaphore.acquire().then(() => {
                const timeout = setTimeout(() => {
                    this.tcpSemaphore.release();
                    resolve(null);
                }, MjvmClientDebugger.TCP_RECEIVED_TIMEOUT);
                this.onReceived((data) => {
                    this.tcpSemaphore.release();
                    clearTimeout(timeout);
                    resolve(data);
                });
                if(!this.client.write(data)) {
                    this.tcpSemaphore.release();
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
        });
    }

    public run() : Thenable<boolean> {
        this.currentStackFrames = undefined;
        this.currentStatus &= ~MjvmClientDebugger.DBG_STATUS_HIT_BKP;
        return new Promise((resolve) => {
            if(!(this.currentStatus & MjvmClientDebugger.DBG_STATUS_STOP))
                resolve(true);
            else this.sendCmd(Buffer.from([MjvmClientDebugger.DBG_RUN])).then((data) => {
                if(data && data.length === 2 && data[0] === MjvmClientDebugger.DBG_RUN && data[1] === 0)
                    resolve(true);
                else
                    resolve(false);
            });
        });
    }

    private waitStop(timeout: number) : Thenable<boolean> {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if(this.currentStatus & MjvmClientDebugger.DBG_STATUS_STOP) {
                    resolve(true);
                    clearInterval(interval);
                }
                else if(timeout > 50)
                    timeout -= 50;
                else {
                    resolve(false);
                    clearInterval(interval);
                }
            }, 50);
        });
    }

    public stop() : Thenable<boolean> {
        return new Promise((resolve) => {
            if(this.currentStatus & MjvmClientDebugger.DBG_STATUS_STOP)
                resolve(true);
            else this.sendCmd(Buffer.from([MjvmClientDebugger.DBG_STOP])).then((data) => {
                if(!(data && data.length === 2 && data[0] === MjvmClientDebugger.DBG_STOP && data[1] === 0))
                    resolve(false);
                else if(this.currentStatus & MjvmClientDebugger.DBG_STATUS_STOP)
                    resolve(true);
                else
                    this.waitStop(MjvmClientDebugger.TCP_RECEIVED_TIMEOUT).then((value) => resolve(value));
            });
        });
    }

    private calcCrc(str: string) : number {
        let crc: number = 0;
        for(let i = 0; i < str.length; i++)
            crc += str.charCodeAt(i);
        return crc;
    }

    private putConstUtf8ToBuffer(buff: Buffer, str: string, offset: number) : number {
        buff[offset++] = (str.length >>> 0) & 0xFF;
        buff[offset++] = (str.length >>> 8) & 0xFF;
        const crc = this.calcCrc(str);
        buff[offset++] = (crc >>> 0) & 0xFF;
        buff[offset++] = (crc >>> 8) & 0xFF;
        const data = Buffer.from(str);
        data.copy(buff, offset);
        return offset + data.length + 1;
    }

    public removeAllBreakPoints() : Thenable<boolean> {
        return new Promise((resolve) => {
            this.sendCmd(Buffer.from([MjvmClientDebugger.DBG_REMOVE_ALL_BKP])).then((data) => {
                if(data && data[0] === MjvmClientDebugger.DBG_REMOVE_ALL_BKP && data[1] === 0)
                    resolve(true);
                else
                    resolve(false);
            });
        });
    }

    private getRemoveBreakpointList(lines: number[], source: string) : DebugLineInfo[] | null {
        const ret: DebugLineInfo[] = [];
        for(let i = 0; i < this.currentBreakpoints.length; i++) {
            if(source === this.currentBreakpoints[i].sourcePath) {
                let isContain = false;
                for(let j = 0; j < lines.length; j++) {
                    if(this.currentBreakpoints[i].line === lines[j]) {
                        isContain = true;
                        break;
                    }
                }
                if(!isContain)
                    ret.push(this.currentBreakpoints[i]);
            }
        }
        return ret;
    }

    private getAddBreakpointList(lines: number[], source: string) : DebugLineInfo[] | null {
        const ret: DebugLineInfo[] = [];
        for(let i = 0; i < lines.length; i++) {
            let isContain = false;
            for(let j = 0; j < this.currentBreakpoints.length; j++) {
                if(source === this.currentBreakpoints[j].sourcePath && this.currentBreakpoints[j].line === lines[i]) {
                    isContain = true;
                    break;
                }
            }
            if(!isContain) {
                const lineInfo = DebugLineInfo.getLineInfoFromLine(lines[i], source);
                if(lineInfo)
                    ret.push(lineInfo);
                else
                    return null;
            }
        }
        return ret;
    }

    private removeBreakPoints(lineInfo: DebugLineInfo[]) : Thenable<boolean> {
        return new Promise((resolve) => {
            const addTask = () => {
                const line = lineInfo.shift();
                if(line) {
                    let bufferSize = 1 + 4;
                    bufferSize += 4 + line.className.length + 1;
                    bufferSize += 4 + line.methodName.length + 1;
                    bufferSize += 4 + line.descriptor.length + 1;

                    const txBuff = Buffer.alloc(bufferSize);
                    let index = 0;

                    /* command code */
                    txBuff[index++] = MjvmClientDebugger.DBG_REMOVE_BKP;

                    /* pc value */
                    txBuff[index++] = (line.pc >>> 0) & 0xFF;
                    txBuff[index++] = (line.pc >>> 8) & 0xFF;
                    txBuff[index++] = (line.pc >>> 16) & 0xFF;
                    txBuff[index++] = (line.pc >>> 24) & 0xFF;

                    /* class name */
                    const className = line.className.replace(/\\/g, '/');
                    index = this.putConstUtf8ToBuffer(txBuff, className, index);

                    /* method name */
                    index = this.putConstUtf8ToBuffer(txBuff, line.methodName, index);

                    /* descriptor */
                    index = this.putConstUtf8ToBuffer(txBuff, line.descriptor, index);

                    this.sendCmd(txBuff).then((data) => {
                        if(data && data[0] === MjvmClientDebugger.DBG_REMOVE_BKP && data[1] === 0) {
                            const index = this.currentBreakpoints.findIndex(item => item === line);
                            this.currentBreakpoints.splice(index, 1);
                            addTask();
                        }
                        else
                            resolve(false);
                    });
                }
                else
                    resolve(true);
            };
            addTask();
        });
    }

    private addBreakPoints(lineInfo: DebugLineInfo[]) : Thenable<boolean> {
        return new Promise((resolve) => {
            const addTask = () => {
                const line = lineInfo.shift();
                if(line) {
                    let bufferSize = 1 + 4;
                    bufferSize += 4 + line.className.length + 1;
                    bufferSize += 4 + line.methodName.length + 1;
                    bufferSize += 4 + line.descriptor.length + 1;

                    const txBuff = Buffer.alloc(bufferSize);
                    let index = 0;

                    /* command code */
                    txBuff[index++] = MjvmClientDebugger.DBG_ADD_BKP;

                    /* pc value */
                    txBuff[index++] = (line.pc >>> 0) & 0xFF;
                    txBuff[index++] = (line.pc >>> 8) & 0xFF;
                    txBuff[index++] = (line.pc >>> 16) & 0xFF;
                    txBuff[index++] = (line.pc >>> 24) & 0xFF;

                    /* class name */
                    const className = line.className.replace(/\\/g, '/');
                    index = this.putConstUtf8ToBuffer(txBuff, className, index);

                    /* method name */
                    index = this.putConstUtf8ToBuffer(txBuff, line.methodName, index);

                    /* descriptor */
                    index = this.putConstUtf8ToBuffer(txBuff, line.descriptor, index);

                    this.sendCmd(txBuff).then((data) => {
                        if(data && data[0] === MjvmClientDebugger.DBG_ADD_BKP && data[1] === 0) {
                            this.currentBreakpoints.push(line);
                            addTask();
                        }
                        else
                            resolve(false);
                    });
                }
                else
                    resolve(true);
            };
            addTask();
        });
    }

    public setBreakPointsRequest(lines: number[], source: string) : Thenable<boolean> {
        return new Promise((resolve) => {
            let bkps = this.getRemoveBreakpointList(lines, source);
            if(bkps === null) {
                resolve(false);
                return;
            }
            else if(bkps.length > 0) {
                this.removeBreakPoints(bkps).then((value) => {
                    if(!value) {
                        resolve(false);
                        return;
                    }
                });
            }
            bkps = this.getAddBreakpointList(lines, source);
            if(bkps === null) {
                resolve(false);
                return;
            }
            else if(bkps.length > 0) {
                this.addBreakPoints(bkps).then((value) => {
                    if(!value) {
                        resolve(false);
                        return;
                    }
                });
            }
            resolve(true);
        });
    }

    private singleStepInRequest() : Thenable<StackFrame | null> {
        this.currentStackFrames = undefined;
        this.currentStatus &= ~MjvmClientDebugger.DBG_STATUS_HIT_BKP;
        return new Promise((resolve) => {
            this.sendCmd(Buffer.from([MjvmClientDebugger.DBG_SINGLE_STEP])).then((data) => {
                if(!(data && data[0] === MjvmClientDebugger.DBG_SINGLE_STEP && data[1] === 0))
                    resolve(null);
                else this.waitStop(MjvmClientDebugger.TCP_RECEIVED_TIMEOUT).then((value) => {
                    if(!value)
                        resolve(null);
                    else this.readStackFrame(0).then((frame) => {
                        resolve(frame);
                    });
                });
            });
        });
    }

    public stepInRequest() : Thenable<boolean> {
        return new Promise((resolve) => {
            if(!(this.currentStatus & MjvmClientDebugger.DBG_STATUS_STOP))
                resolve(false);
            else {
                const task = (currentFrame: StackFrame | null) => {
                    if(!currentFrame)
                        resolve(false);
                    else {
                        const responseHandler = (frame: StackFrame | null) => {
                            if(!frame)
                                resolve(false);
                            else if(currentFrame.line !== frame.line || currentFrame.source?.path !== frame.source?.path)
                                resolve(true);
                            else if(
                                currentFrame.line === frame.line &&
                                currentFrame.source?.path === frame.source?.path &&
                                currentFrame.instructionPointerReference == frame.instructionPointerReference
                            )
                                resolve(true);
                            else
                                this.singleStepInRequest().then(responseHandler);
                        };
                        this.singleStepInRequest().then(responseHandler);
                    }
                }
                if(this.currentStackFrames)
                    task(this.currentStackFrames[0]);
                else
                    this.readStackFrame(0).then(task);
            }
        });
    }

    private readStackFrame(stackIndex: number) : Thenable<StackFrame | null> {
        return new Promise((resolve) => {
            const txData: Buffer = Buffer.alloc(5);
            txData[0] = MjvmClientDebugger.DBG_READ_STACK_TRACE;
            txData[1] = stackIndex & 0xFF;
            txData[2] = (stackIndex >>> 8) & 0xFF;
            txData[3] = (stackIndex >>> 16) & 0xFF;
            txData[4] = (stackIndex >>> 24) & 0xFF;
            this.sendCmd(txData).then((data) => {
                if(data && data[0] === MjvmClientDebugger.DBG_READ_STACK_TRACE && data[1] === 0) {
                    let index = 2;
                    const currentStackIndex = this.readU32(data, index);
                    if(currentStackIndex !== stackIndex) {
                        resolve(null);
                        return;
                    }
                    index += 4;
                    const pc = this.readU32(data, index);
                    index += 4;
                    const classNameLength = this.readU16(data, index);
                    index += 2 + 2;
                    const className = data.toString('utf-8', index, index + classNameLength);
                    index += classNameLength + 1;
                    const nameLength = this.readU16(data, index);
                    index += 2 + 2;
                    const name = data.toString('utf-8', index, index + nameLength);
                    index += nameLength + 1;
                    const descriptorLength = this.readU16(data, index);
                    index += 2 + 2;
                    const descriptor = data.toString('utf-8', index, index + descriptorLength);

                    const lineInfo = DebugLineInfo.getLineInfoFromPc(pc, className, name, descriptor);

                    if(lineInfo && lineInfo.sourcePath) {
                        const src = new Source(className + ".java", lineInfo.sourcePath);
                        const sf = new StackFrame(currentStackIndex, name, src, lineInfo.line);
                        sf.instructionPointerReference = pc.toString();
                        resolve(sf);
                        return;
                    }
                    resolve(null);
                }
                resolve(null);
            });
        });
    }

    public stackFrameRequest() : Thenable<StackFrame[] | null> {
        return new Promise((resolve) => {
            if(this.currentStackFrames)
                resolve(this.currentStackFrames);
            else {
                const ret: StackFrame[] = [];
                this.readStackFrame(0).then((frame) => {
                    if(frame) {
                        ret.push(frame);
                        this.currentStackFrames = ret;
                        resolve(this.currentStackFrames);
                    }
                    else
                        resolve(null);
                });
            }
        });
    }

    public disconnect() {
        this.currentStackFrames = undefined;
        this.currentStatus = 0x03;
        if(this.requestStatusTask) {
            clearInterval(this.requestStatusTask);
            this.requestStatusTask = undefined;
        }
        this.client.end();
    }

    private readU16(data: Buffer, offset : number) : number {
        let ret = data[offset];
        ret |= data[offset + 1] << 8;
        return ret;
    }

    private readU32(data: Buffer, offset : number) : number {
        let ret = data[offset];
        ret |= data[offset + 1] << 8;
        ret |= data[offset + 2] << 16;
        ret |= data[offset + 3] << 24;
        return ret;
    }
}
