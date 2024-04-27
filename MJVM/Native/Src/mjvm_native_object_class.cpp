
#include <string.h>
#include "mjvm.h"
#include "mjvm_object.h"
#include "mjvm_const_name.h"
#include "mjvm_native_object_class.h"

static bool nativeGetClass(Execution &execution) {
    // TODO
    return true;
}

static bool nativeHashCode(Execution &execution) {
    MjvmObject *obj = execution.stackPopObject();
    execution.stackPushInt32((int32_t)obj);
    return true;
}

static bool nativeClone(Execution &execution) {
    MjvmObject *obj = execution.stackPopObject();
    if(obj->dimensions > 0) {
        uint8_t atype = MjvmObject::isPrimType(obj->type);
        uint8_t elementSize = atype ? MjvmObject::getPrimitiveTypeSize(atype) : sizeof(MjvmObject *);
        uint32_t length = obj->size / elementSize;
        Mjvm::lock();
        MjvmObject *cloneObj = execution.newObject(obj->size, obj->type, obj->dimensions);
        memcpy(cloneObj->data, obj->data, obj->size);
        execution.stackPushObject(cloneObj);
        Mjvm::unlock();
        return true;
    }
    else {
        throw "CloneNotSupportedException";
        return false;
    }
}

static const NativeMethod methods[] = {
    NATIVE_METHOD("\x08\x00""getClass", "\x09\x00""()LClass;", nativeGetClass),
    NATIVE_METHOD("\x08\x00""hashCode", "\x03\x00""()I",       nativeHashCode),
};

const NativeClass OBJECT_CLASS = NATIVE_CLASS(objectClass, methods);