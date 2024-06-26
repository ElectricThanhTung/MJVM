
#include <iostream>
#include "mjvm.h"
#include "mjvm_fields_data.h"
#include "mjvm_execution.h"

FieldData32::FieldData32(const FieldInfo &fieldInfo) : fieldInfo(fieldInfo), value(0) {

}

FieldData64::FieldData64(const FieldInfo &fieldInfo) : fieldInfo(fieldInfo), value(0) {

}

FieldObject::FieldObject(const FieldInfo &fieldInfo) : fieldInfo(fieldInfo), object(0) {

}

FieldsData::FieldsData(Execution &execution, const ClassLoader &classLoader, bool isStatic) :
fields32Count(0), fields64Count(0), fieldsObjCount(0) {
    if(isStatic)
        loadStatic(classLoader);
    else
        loadNonStatic(execution, classLoader);
}

void FieldsData::loadStatic(const ClassLoader &classLoader) {
    uint16_t fieldsCount = classLoader.getFieldsCount();
    uint16_t field32Index = 0;
    uint16_t field64Index = 0;
    uint16_t fieldObjIndex = 0;

    for(uint16_t index = 0; index < fieldsCount; index++) {
        const FieldInfo &fieldInfo = classLoader.getFieldInfo(index);
        if((fieldInfo.accessFlag & FIELD_STATIC) == FIELD_STATIC) {
            switch(fieldInfo.descriptor.text[0]) {
                case 'J':   /* Long */
                case 'D':   /* Double */
                    (*(uint32_t *)&fields64Count)++;
                    break;
                case 'L':   /* An instance of class ClassName */
                case '[':   /* Array */
                    (*(uint32_t *)&fieldsObjCount)++;
                    break;
                default:
                    (*(uint32_t *)&fields32Count)++;
                    break;
            }
        }
    }

    fieldsData32 = (fields32Count) ? (FieldData32 *)Mjvm::malloc(fields32Count * sizeof(FieldData32)) : 0;
    fieldsData64 = (fields64Count) ? (FieldData64 *)Mjvm::malloc(fields64Count * sizeof(FieldData64)) : 0;
    fieldsObject = (fieldsObjCount) ? (FieldObject *)Mjvm::malloc(fieldsObjCount * sizeof(FieldObject)) : 0;

    for(uint16_t index = 0; index < fieldsCount; index++) {
        const FieldInfo &fieldInfo = classLoader.getFieldInfo(index);
        if((fieldInfo.accessFlag & FIELD_STATIC) == FIELD_STATIC) {
            switch(fieldInfo.descriptor.text[0]) {
                case 'J':   /* Long */
                case 'D':   /* Double */
                    new (&fieldsData64[field64Index++])FieldData64(fieldInfo);
                    break;
                case 'L':   /* An instance of class ClassName */
                case '[':   /* Array */
                    new (&fieldsObject[fieldObjIndex++])FieldObject(fieldInfo);
                    break;
                default:
                    new (&fieldsData32[field32Index++])FieldData32(fieldInfo);
                    break;
            }
        }
    }
}

void FieldsData::loadNonStatic(Execution &execution, const ClassLoader &classLoader) {
    uint16_t field32Index = 0;
    uint16_t field64Index = 0;
    uint16_t fieldObjIndex = 0;

    const ClassLoader *loader = &classLoader;

    while(loader) {
        uint16_t fieldsCount = loader->getFieldsCount();
        for(uint16_t index = 0; index < fieldsCount; index++) {
            const FieldInfo &fieldInfo = loader->getFieldInfo(index);
            if((fieldInfo.accessFlag & FIELD_STATIC) != FIELD_STATIC) {
                switch(fieldInfo.descriptor.text[0]) {
                    case 'J':   /* Long */
                    case 'D':   /* Double */
                        (*(uint32_t *)&fields64Count)++;
                        break;
                    case 'L':   /* An instance of class ClassName */
                    case '[':   /* Array */
                        (*(uint32_t *)&fieldsObjCount)++;
                        break;
                    default:
                        (*(uint32_t *)&fields32Count)++;
                        break;
                }
            }
        }
        ConstUtf8 *superClass = &loader->getSuperClass();
        loader = superClass ? &execution.load(*superClass) : 0;
    }

    fieldsData32 = (fields32Count) ? (FieldData32 *)Mjvm::malloc(fields32Count * sizeof(FieldData32)) : 0;
    fieldsData64 = (fields64Count) ? (FieldData64 *)Mjvm::malloc(fields64Count * sizeof(FieldData64)) : 0;
    fieldsObject = (fieldsObjCount) ? (FieldObject *)Mjvm::malloc(fieldsObjCount * sizeof(FieldObject)) : 0;

    loader = &classLoader;
    while(loader) {
        uint16_t fieldsCount = loader->getFieldsCount();
        for(uint16_t index = 0; index < fieldsCount; index++) {
            const FieldInfo &fieldInfo = loader->getFieldInfo(index);
            if((fieldInfo.accessFlag & FIELD_STATIC) != FIELD_STATIC) {
                switch(fieldInfo.descriptor.text[0]) {
                    case 'J':   /* Long */
                    case 'D':   /* Double */
                        new (&fieldsData64[field64Index++])FieldData64(fieldInfo);
                        break;
                    case 'L':   /* An instance of class ClassName */
                    case '[':   /* Array */
                        new (&fieldsObject[fieldObjIndex++])FieldObject(fieldInfo);
                        break;
                    default:
                        new (&fieldsData32[field32Index++])FieldData32(fieldInfo);
                        break;
                }
            }
        }
        ConstUtf8 *superClass = &loader->getSuperClass();
        loader = superClass ? &execution.load(*superClass) : 0;
    }
}

FieldData32 &FieldsData::getFieldData32(const ConstNameAndType &fieldName) const {
    if(fields32Count) {
        for(uint16_t i = 0; i < fields32Count; i++) {
            const FieldInfo &fieldInfo = fieldsData32[i].fieldInfo;
            if(fieldInfo.name == fieldName.name && fieldInfo.descriptor == fieldName.descriptor)
                return fieldsData32[i];
        }
    }
    return *(FieldData32 *)0;
}

FieldData64 &FieldsData::getFieldData64(const ConstNameAndType &fieldName) const {
    if(fields64Count) {
        for(uint16_t i = 0; i < fields64Count; i++) {
            const FieldInfo &fieldInfo = fieldsData64[i].fieldInfo;
            if(fieldInfo.name == fieldName.name && fieldInfo.descriptor == fieldName.descriptor)
                return fieldsData64[i];
        }
    }
    return *(FieldData64 *)0;
}

FieldObject &FieldsData::getFieldObject(const ConstNameAndType &fieldName) const {
    if(fieldsObjCount) {
        for(uint16_t i = 0; i < fieldsObjCount; i++) {
            const FieldInfo &fieldInfo = fieldsObject[i].fieldInfo;
            if(fieldInfo.name == fieldName.name && fieldInfo.descriptor == fieldName.descriptor)
                return fieldsObject[i];
        }
    }
    return *(FieldObject *)0;
}

FieldsData::~FieldsData(void) {
    if(fieldsData32)
        Mjvm::free(fieldsData32);
    if(fieldsData64)
        Mjvm::free(fieldsData64);
    if(fieldsObject)
        Mjvm::free(fieldsObject);
}

ClassData::~ClassData() {
    if(staticFiledsData) {
        staticFiledsData->~FieldsData();
        Mjvm::free(staticFiledsData);
    }
}

ClassData::ClassData(const char *fileName) : ClassLoader(fileName) {
    ownId = 0;
    monitorCount = 0;
    isInitializing = 0;
    staticFiledsData = 0;
    next = 0;
}

ClassData::ClassData(const char *fileName, uint16_t length) : ClassLoader(fileName, length) {
    ownId = 0;
    monitorCount = 0;
    isInitializing = 0;
    staticFiledsData = 0;
    next = 0;
}

ClassData::ClassData(const ConstUtf8 &fileName) : ClassLoader(fileName) {
    ownId = 0;
    monitorCount = 0;
    isInitializing = 0;
    staticFiledsData = 0;
    next = 0;
}
