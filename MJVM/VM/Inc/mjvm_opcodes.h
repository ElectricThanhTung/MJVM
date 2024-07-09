#ifndef __MVM_OPCODES_H
#define __MVM_OPCODES_H

#include "mjvm_std_types.h"

typedef enum : uint8_t {
    OP_NOP = 0x00,
    OP_ACONST_NULL = 0x01,
    OP_ICONST_M1 = 0x02,
    OP_ICONST_0 = 0x03,
    OP_ICONST_1 = 0x04,
    OP_ICONST_2 = 0x05,
    OP_ICONST_3 = 0x06,
    OP_ICONST_4 = 0x07,
    OP_ICONST_5 = 0x08,
    OP_LCONST_0 = 0x09,
    OP_LCONST_1 = 0x0A,
    OP_FCONST_0 = 0x0B,
    OP_FCONST_1 = 0x0C,
    OP_FCONST_2 = 0x0D,
    OP_DCONST_0 = 0x0E,
    OP_DCONST_1 = 0x0F,

    OP_BIPUSH = 0x10,
    OP_SIPUSH = 0x11,
    OP_LDC = 0x12,
    OP_LDC_W = 0x13,
    OP_LDC2_W = 0x14,

    OP_ILOAD = 0x15,
    OP_LLOAD = 0x16,
    OP_FLOAD = 0x17,
    OP_DLOAD = 0x18,
    OP_ALOAD = 0x19,

    OP_ILOAD_0 = 0x1A,
    OP_ILOAD_1 = 0x1B,
    OP_ILOAD_2 = 0x1C,
    OP_ILOAD_3 = 0x1D,
    OP_LLOAD_0 = 0x1E,
    OP_LLOAD_1 = 0x1F,
    OP_LLOAD_2 = 0x20,
    OP_LLOAD_3 = 0x21,
    OP_FLOAD_0 = 0x22,
    OP_FLOAD_1 = 0x23,
    OP_FLOAD_2 = 0x24,
    OP_FLOAD_3 = 0x25,
    OP_DLOAD_0 = 0x26,
    OP_DLOAD_1 = 0x27,
    OP_DLOAD_2 = 0x28,
    OP_DLOAD_3 = 0x29,

    OP_ALOAD_0 = 0x2A,
    OP_ALOAD_1 = 0x2B,
    OP_ALOAD_2 = 0x2C,
    OP_ALOAD_3 = 0x2D,

    OP_IALOAD = 0x2E,
    OP_LALOAD = 0x2F,
    OP_FALOAD = 0x30,
    OP_DALOAD = 0x31,
    OP_AALOAD = 0x32,
    OP_BALOAD = 0x33,

    OP_CALOAD = 0x34,
    OP_SALOAD = 0x35,
    OP_ISTORE = 0x36,
    OP_LSTORE = 0x37,
    OP_FSTORE = 0x38,
    OP_DSTORE = 0x39,
    OP_ASTORE = 0x3A,
    OP_ISTORE_0 = 0x3B,
    OP_ISTORE_1 = 0x3C,
    OP_ISTORE_2 = 0x3D,
    OP_ISTORE_3 = 0x3E,
    OP_LSTORE_0 = 0x3F,
    OP_LSTORE_1 = 0x40,
    OP_LSTORE_2 = 0x41,
    OP_LSTORE_3 = 0x42,
    OP_FSTORE_0 = 0x43,
    OP_FSTORE_1 = 0x44,
    OP_FSTORE_2 = 0x45,
    OP_FSTORE_3 = 0x46,
    OP_DSTORE_0 = 0x47,
    OP_DSTORE_1 = 0x48,
    OP_DSTORE_2 = 0x49,
    OP_DSTORE_3 = 0x4A,
    OP_ASTORE_0 = 0x4B,
    OP_ASTORE_1 = 0x4C,
    OP_ASTORE_2 = 0x4D,
    OP_ASTORE_3 = 0x4E,

    OP_IASTORE = 0x4F,
    OP_LASTORE = 0x50,
    OP_FASTORE = 0x51,
    OP_DASTORE = 0x52,
    OP_AASTORE = 0x53,
    OP_BASTORE = 0x54,
    OP_CASTORE = 0x55,
    OP_SASTORE = 0x56,

    OP_POP = 0x57,
    OP_POP2 = 0x58,
    OP_DUP = 0x59,
    OP_DUP_X1 = 0x5A,
    OP_DUP_X2 = 0x5B,
    OP_DUP2 = 0x5C,
    OP_DUP2_X1 = 0x5D,
    OP_DUP2_X2 = 0x5E,

    OP_IADD = 0x60,
    OP_LADD = 0x61,
    OP_FADD = 0x62,
    OP_DADD = 0x63,

    OP_ISUB = 0x64,
    OP_LSUB = 0x65,
    OP_FSUB = 0x66,
    OP_DSUB = 0x67,

    OP_IMUL = 0x68,
    OP_LMUL = 0x69,
    OP_FMUL = 0x6A,
    OP_DMUL = 0x6B,

    OP_IDIV = 0x6C,
    OP_LDIV = 0x6D,
    OP_FDIV = 0x6E,
    OP_DDIV = 0x6F,

    OP_IREM = 0x70,
    OP_LREM = 0x71,
    OP_FREM = 0x72,
    OP_DREM = 0x73,

    OP_INEG = 0x74,
    OP_LNEG = 0x75,
    OP_FNEG = 0x76,
    OP_DNEG = 0x77,

    OP_ISHL = 0x78,
    OP_LSHL = 0x79,
    OP_ISHR = 0x7A,
    OP_LSHR = 0x7B,
    OP_IUSHR = 0x7C,
    OP_LUSHR = 0x7D,
    OP_IAND = 0x7E,
    OP_LAND = 0x7F,
    OP_IOR = 0x80,
    OP_LOR = 0x81,
    OP_IXOR = 0x82,
    OP_LXOR = 0x83,
    OP_IINC = 0x84,

    OP_I2L = 0x85,
    OP_I2F = 0x86,
    OP_I2D = 0x87,
    OP_L2I = 0x88,
    OP_L2F = 0x89,
    OP_L2D = 0x8A,
    OP_F2I = 0x8B,
    OP_F2L = 0x8C,
    OP_F2D = 0x8D,
    OP_D2I = 0x8E,
    OP_D2L = 0x8F,
    OP_D2F = 0x90,
    OP_I2B = 0x91,
    OP_I2C = 0x92,
    OP_I2S = 0x93,

    OP_LCMP = 0x94,
    OP_FCMPL = 0x95,
    OP_FCMPG = 0x96,
    OP_DCMPL = 0x97,
    OP_DCMPG = 0x98,

    OP_IFEQ = 0x99,
    OP_IFNE = 0x9A,
    OP_IFLT = 0x9B,
    OP_IFGE = 0x9C,
    OP_IFGT = 0x9D,
    OP_IFLE = 0x9E,

    OP_IF_ICMPEQ = 0x9F,
    OP_IF_ICMPNE = 0xA0,
    OP_IF_ICMPLT = 0xA1,
    OP_IF_ICMPGE = 0xA2,
    OP_IF_ICMPGT = 0xA3,
    OP_IF_ICMPLE = 0xA4,
    OP_IF_ACMPEQ = 0xA5,
    OP_IF_ACMPNE = 0xA6,

    OP_GOTO = 0xA7,
    OP_JSR = 0xA8,
    OP_RET = 0xA9,
    OP_TABLESWITCH = 0xAA,
    OP_LOOKUPSWITCH = 0xAB,

    OP_IRETURN = 0xAC,
    OP_LRETURN = 0xAD,
    OP_FRETURN = 0xAE,
    OP_DRETURN = 0xAF,
    OP_ARETURN = 0xB0,
    OP_RETURN = 0xB1,

    OP_GETSTATIC = 0xB2,
    OP_PUTSTATIC = 0xB3,
    OP_GETFIELD = 0xB4,
    OP_PUTFIELD = 0xB5,
    OP_INVOKEVIRTUAL = 0xB6,
    OP_INVOKESPECIAL = 0xB7,
    OP_INVOKESTATIC = 0xB8,
    OP_INVOKEINTERFACE = 0xB9,
    OP_INVOKEDYNAMIC = 0xBA,

    OP_NEW = 0xBB,
    OP_NEWARRAY = 0xBC,
    OP_ANEWARRAY = 0xBD,
    OP_ARRAYLENGTH = 0xBE,

    OP_ATHROW = 0xBF,
    OP_CHECKCAST = 0xC0,
    OP_INSTANCEOF = 0xC1,
    OP_MONITORENTER = 0xC2,
    OP_MONITOREXIT = 0xC3,
    OP_WIDE = 0xC4,
    OP_MULTIANEWARRAY = 0xC5,
    OP_IFNULL = 0xC6,
    OP_IFNONNULL = 0xC7,

    OP_GOTO_W = 0xC8,
    OP_JSRW = 0xC9,
    OP_BREAKPOINT = 0xCA,

    OP_EXIT = 0xFF,
} MjvmOpCode;

#endif // __MVM_OPCODES_H
