
import fs = require('fs');
import {
    ConstClass,
    ConstSting,
    ConstMethodType,
    ConstField,
    ConstMethod,
    ConstInterfaceMethod,
    ConstNameAndType,
    ConstInvokeDynamic,
    ConstMethodHandle
} from './mjvm_const_pool';
import {
    AttributeCode,
    AttributeInfo,
    LineNumber,
    AttributeLineNumber
} from './mjvm_attribute_info';
import { MethodInfo } from './mjvm_method_info';

export class ClassLoader {
    public readonly magic: number;
    public readonly minorVersion: number;
    public readonly majorVersion: number;
    public readonly accessFlags: number;
    public readonly thisClass: number;
    public readonly superClass: number;
    public readonly interfacesCount: number;
    
    public methodsInfos: MethodInfo[];

    private readonly poolTable: (
        number |
        string |
        ConstClass |
        ConstSting |
        ConstMethodType |
        ConstField |
        ConstMethod |
        ConstInterfaceMethod |
        ConstNameAndType |
        ConstInvokeDynamic |
        ConstMethodHandle
    )[] = [];

    private static readonly CONST_UTF8 = 1;
    private static readonly CONST_INTEGER = 3;
    private static readonly CONST_FLOAT = 4;
    private static readonly CONST_LONG = 5;
    private static readonly CONST_DOUBLE = 6;
    private static readonly CONST_CLASS = 7;
    private static readonly CONST_STRING = 8;
    private static readonly CONST_FIELD = 9;
    private static readonly CONST_METHOD = 10;
    private static readonly CONST_INTERFACE_METHOD = 11;
    private static readonly CONST_NAME_AND_TYPE = 12;
    private static readonly CONST_METHOD_HANDLE = 15;
    private static readonly CONST_METHOD_TYPE = 16;
    private static readonly CONST_INVOKE_DYNAMIC = 18;

    private static readonly CLASS_PUBLIC = 0x0001;
    private static readonly CLASS_FINAL = 0x0010;
    private static readonly CLASS_SUPER = 0x0020;
    private static readonly CLASS_INTERFACE = 0x0200;
    private static readonly CLASS_ABSTRACT = 0x0400;
    private static readonly CLASS_SYNTHETIC = 0x1000;
    private static readonly CLASS_ANNOTATION = 0x2000;
    
    private static readonly FIELD_PUBLIC = 0x0001;
    private static readonly FIELD_PRIVATE = 0x0002;
    private static readonly FIELD_PROTECTED = 0x0004;
    private static readonly FIELD_STATIC = 0x0008;
    private static readonly FIELD_FINAL = 0x0010;
    private static readonly FIELD_VOLATILE = 0x0040;
    private static readonly FIELD_TRANSIENT = 0x0080;
    private static readonly FIELD_SYNTHETIC = 0x1000;
    private static readonly FIELD_ENUM = 0x4000;
    private static readonly FIELD_UNLOAD = 0x8000;

    public constructor(filePath: string) {
        const data = fs.readFileSync(filePath, null);

        let index = 0;
        this.magic = this.readU32(data, index);
        index += 4;
        this.minorVersion = this.readU16(data, index);
        index += 2;
        this.majorVersion = this.readU16(data, index);
        index += 2;
        const poolCount = this.readU16(data, index) - 1;
        index += 2;

        for(let i = 0; i < poolCount; i++) {
            const tag = data[index];
            index++;
            switch(tag) {
                case ClassLoader.CONST_UTF8: {
                    const length = this.readU16(data, index);
                    index += 2;
                    this.poolTable.push(data.toString('utf-8', index, index + length));
                    index += length;
                    break;
                }
                case ClassLoader.CONST_INTEGER:
                case ClassLoader.CONST_FLOAT:
                    this.poolTable.push(this.readU32(data, index));
                    index += 4;
                    break;
                case ClassLoader.CONST_FIELD:
                case ClassLoader.CONST_METHOD:
                case ClassLoader.CONST_INTERFACE_METHOD:
                case ClassLoader.CONST_NAME_AND_TYPE:
                case ClassLoader.CONST_INVOKE_DYNAMIC:
                    const index1 = this.readU16(data, index);
                    index += 2;
                    const index2 = this.readU16(data, index);
                    index += 2;
                    if(tag === ClassLoader.CONST_FIELD)
                        this.poolTable.push(new ConstField(index1, index2));
                    else if(tag === ClassLoader.CONST_METHOD)
                        this.poolTable.push(new ConstMethod(index1, index2));
                    else if(tag === ClassLoader.CONST_INTERFACE_METHOD)
                        this.poolTable.push(new ConstInterfaceMethod(index1, index2));
                    else if(tag === ClassLoader.CONST_NAME_AND_TYPE)
                        this.poolTable.push(new ConstNameAndType(index1, index2));
                    else if(tag === ClassLoader.CONST_INVOKE_DYNAMIC)
                        this.poolTable.push(new ConstInvokeDynamic(index1, index2));
                    break;
                case ClassLoader.CONST_LONG:
                case ClassLoader.CONST_DOUBLE: {
                    this.poolTable.push(this.readU64(data, index));
                    index += 8;
                    i++;
                    this.poolTable.push(0);
                    break;
                }
                case ClassLoader.CONST_CLASS:
                case ClassLoader.CONST_STRING:
                case ClassLoader.CONST_METHOD_TYPE: {
                    const constUtf8Index = this.readU16(data, index);
                    index += 2;
                    if(tag === ClassLoader.CONST_CLASS)
                        this.poolTable.push(new ConstClass(constUtf8Index));
                    else if(tag === ClassLoader.CONST_STRING)
                        this.poolTable.push(new ConstSting(constUtf8Index));
                    else if(tag === ClassLoader.CONST_METHOD_TYPE)
                        this.poolTable.push(new ConstMethodType(constUtf8Index));
                    break;
                }
                case ClassLoader.CONST_METHOD_HANDLE: {
                    const index1 = data[index];
                    index++;
                    const index2 = this.readU16(data, index);
                    index += 2;
                    this.poolTable.push(new ConstMethodHandle(index1, index2));
                    break;
                }
                default:
                    throw "uknow pool type";
            }
        }

        this.accessFlags = this.readU16(data, index);
        index += 2;
        this.thisClass = this.readU16(data, index);
        index += 2;
        this.superClass = this.readU16(data, index);
        index += 2;
        this.interfacesCount = this.readU16(data, index);
        index += 2;

        if(this.interfacesCount)
            index += this.interfacesCount * 2;

        const fieldsCount = this.readU16(data, index);
        index += 2;

        if(fieldsCount) {
            for(let i = 0; i < fieldsCount; i++) {
                const flag = this.readU16(data, index);
                index += 2;
                const fieldsNameIndex = this.readU16(data, index);
                index += 2;
                const fieldsDescriptorIndex = this.readU16(data, index);
                index += 2;
                let fieldsAttributesCount = this.readU16(data, index);
                index += 2;
                while(fieldsAttributesCount--) {
                    const tmp: [number, AttributeInfo | null] = this.readAttribute(data, index);
                    index = tmp[0];
                }
            }
        }
        const methodsCount = this.readU16(data, index);
        index += 2;
        const methodsInfos: MethodInfo[] = [];
        if(methodsCount) {
            for(let i = 0; i < methodsCount; i++) {
                const flag = this.readU16(data, index);
                index += 2;
                const methodNameIndex = this.readU16(data, index);
                index += 2;
                const methodDescriptorIndex = this.readU16(data, index);
                index += 2;
                let methodAttributesCount = this.readU16(data, index);
                index += 2;
                let attributeCode: AttributeCode | null = null;
                while(methodAttributesCount--) {
                    const tmp: [number, AttributeInfo | null] = this.readAttribute(data, index);
                    index = tmp[0];
                    if(tmp[1]) {
                        if(tmp[1].tag === AttributeInfo.ATTRIBUTE_CODE) {
                            attributeCode = tmp[1] as AttributeCode;
                            break;
                        }
                    }
                }
                const methodName: string = this.poolTable[methodNameIndex - 1] as string;
                const methodDescriptor: string = this.poolTable[methodDescriptorIndex - 1] as string;
                if(!(flag & (MethodInfo.METHOD_NATIVE | MethodInfo.METHOD_BRIDGE)))
                    methodsInfos.push(new MethodInfo(methodName, methodDescriptor, attributeCode));
            }
        }
        this.methodsInfos = methodsInfos;
    }

    private readAttribute(data: Buffer, index: number) : [number, AttributeInfo | null] {
        const nameIndex: number = this.readU16(data, index);
        index += 2;
        const length = this.readU32(data, index);
        index += 4;
        const type: number = AttributeInfo.parseAttributeType(this.poolTable[nameIndex - 1] as string);
        switch(type) {
            case AttributeInfo.ATTRIBUTE_CODE:
                return this.readAttributeCode(data, index);
            case AttributeInfo.ATTRIBUTE_LINE_NUMBER_TABLE:
                return this.readAttributeLineNumberTable(data, index);
            default:
                index += length;
                return [index, null];
        }
    }

    private readAttributeCode(data: Buffer, index: number) : [number, AttributeCode] {
        const maxStack: number = this.readU16(data, index);
        index += 2;
        const maxLocals: number = this.readU16(data, index);
        index += 2;
        const codeLength: number = this.readU32(data, index);
        index += 4;
        const code: Buffer = Buffer.alloc(codeLength)
        data.copy(code, 0, index, index + codeLength);
        index += codeLength;
        const exceptionTableLength = this.readU16(data, index);
        index += 2;
        index += exceptionTableLength * 8;
        let attrbutesCount = this.readU16(data, index);
        index += 2;
        if(attrbutesCount) {
            const attr: AttributeInfo[] = [];
            while(attrbutesCount--) {
                const tmp: [number, AttributeInfo | null] = this.readAttribute(data, index);
                index = tmp[0];
                if(tmp[1])
                    attr.push(tmp[1]);
            }
            return [index, new AttributeCode(maxStack, maxLocals, code, attr)];
        }
        return [index, new AttributeCode(maxStack, maxLocals, code, null)];
    }

    private readAttributeLineNumberTable(data: Buffer, index: number) : [number, AttributeLineNumber] {
        const lineNumberTableLength: number = this.readU16(data, index);
        index += 2;
        const linesNumber: LineNumber[] = [];
        for(let i = 0; i < lineNumberTableLength; i++) {
            const startPc = this.readU16(data, index);
            index += 2;
            const lineNumber = this.readU16(data, index);
            index += 2;
            linesNumber.push(new LineNumber(startPc, lineNumber));
        }
        return [index, new AttributeLineNumber(linesNumber)];
    }

    public getMethodInfo(name: string, descriptor: string) : MethodInfo | null {
        if(!this.methodsInfos)
            return null;
        for(let i = 0; i < this.methodsInfos.length; i++) {
            if(this.methodsInfos[i].name === name && this.methodsInfos[i].descriptor === descriptor)
                return this.methodsInfos[i];
        }
        return null;
    }

    private readU16(data: Buffer, offset : number) : number {
        let ret = data[offset + 1];
        ret |= data[offset] << 8;
        return ret;
    }

    private readU32(data: Buffer, offset : number) : number {
        let ret = data[offset + 3];
        ret |= data[offset + 2] << 8;
        ret |= data[offset + 1] << 16;
        ret |= data[offset] << 24;
        return ret;
    }

    private readU64(data: Buffer, offset : number) : number {
        let ret = data[offset + 7];
        ret |= data[offset + 6] << 8;
        ret |= data[offset + 5] << 16;
        ret |= data[offset + 4] << 24;
        ret |= data[offset + 3] << 32;
        ret |= data[offset + 2] << 40;
        ret |= data[offset + 1] << 48;
        ret |= data[offset] << 56;
        return ret;
    }
}
