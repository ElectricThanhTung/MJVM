
#ifndef __MJVM_DEBUGGER_H
#define __MJVM_DEBUGGER_H

#include "mjvm_method_info.h"

#if __has_include("mjvm_conf.h")
#include "mjvm_conf.h"
#endif

#ifndef MAX_OF_BREAK_POINT
#define MAX_OF_BREAK_POINT          10
#warning "MAX_OF_BREAK_POINT is not defined. Default value will be used"
#endif /* MAX_OF_BREAK_POINT */

#define DBG_STATUS_STOP             0x01
#define DBG_STATUS_HIT_BKP          0x02
#define DBG_STATUS_SINGLE_STEP      0x04

class Execution;

typedef enum : uint8_t {
    DBG_READ_STATUS,
    DBG_READ_STACK_TRACE,
    DBG_ADD_BKP,
    DBG_REMOVE_BKP,
    DBG_REMOVE_ALL_BKP,
    DBG_RUN,
    DBG_STOP,
    DBG_SINGLE_STEP,
    DBG_READ_VARIABLE,
    DBG_WRITE_VARIABLE,
} DebuggerCmd;

class BreakPoint {
public:
    uint32_t pc;
    MethodInfo *method;

    BreakPoint(void);
    BreakPoint(uint32_t pc, MethodInfo &method);
private:
    BreakPoint(const BreakPoint &) = delete;
};

class StackTrace {
public:
    const uint32_t pc;
    MethodInfo &method;

    StackTrace(void);
    StackTrace(uint32_t pc, MethodInfo &method);
private:
    StackTrace(const StackTrace &) = delete;
    void operator=(const StackTrace &) = delete;
};

class Debugger {
private:
    Execution &execution;
public:
    volatile uint8_t status;
    volatile uint8_t breakPointCount;
    BreakPoint breakPoints[MAX_OF_BREAK_POINT];

    Debugger(Execution &execution);

    virtual void sendData(uint8_t *data, uint32_t length) = 0;

    void receivedDataHandler(uint8_t *data, uint32_t length);
private:
    Debugger(const Debugger &) = delete;
    void operator=(const Debugger &) = delete;

    bool addBreakPoint(uint32_t pc, ConstUtf8 &className, ConstUtf8 &methodName, ConstUtf8 &descriptor);
    bool removeBreakPoint(uint32_t pc, ConstUtf8 &className, ConstUtf8 &methodName, ConstUtf8 &descriptor);
};

#endif /* __MJVM_DEBUGGER_H */
