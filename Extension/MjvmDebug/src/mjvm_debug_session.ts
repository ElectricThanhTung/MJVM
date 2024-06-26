
import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent, InvalidatedEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint, MemoryEvent
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import * as vscode from 'vscode';
import { MjvmClientDebugger } from './mjvm_client_debugger';

export class MjvmDebugSession extends LoggingDebugSession {
    private clientDebugger: MjvmClientDebugger;

    public constructor() {
        super('mjvm-debug.txt');
        this.clientDebugger = new MjvmClientDebugger();

        this.clientDebugger.onHitBkp(() => {
            this.sendEvent(new StoppedEvent('stop', 1));
        });

        this.clientDebugger.onError(() => {

        });

        this.clientDebugger.onClose(() => {
            this.sendEvent(new TerminatedEvent());
        });

        this.clientDebugger.connect();
    }

    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response.body = response.body || {};
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsStepBack = false;
        response.body.supportsStepInTargetsRequest = true;
        response.body.supportsSteppingGranularity = true;
		response.body.supportsDataBreakpoints = true;
		response.body.supportsCompletionsRequest = true;
		response.body.supportsCancelRequest = true;
		response.body.supportsBreakpointLocationsRequest = true;
		response.body.supportsExceptionFilterOptions = true;
		response.body.supportsExceptionInfoRequest = true;
		response.body.supportsSetVariable = true;
		response.body.supportsSetExpression = true;
		response.body.supportsDisassembleRequest = true;
		response.body.supportsInstructionBreakpoints = true;
		response.body.supportsReadMemoryRequest = true;
		response.body.supportsWriteMemoryRequest = true;
		response.body.supportSuspendDebuggee = true;
		response.body.supportTerminateDebuggee = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsDelayedStackTraceLoading = true;
        response.body.supportsHitConditionalBreakpoints = true;
        response.body.supportsConditionalBreakpoints = true;
        response.body.supportsLogPoints = true;
        response.body.supportsRestartRequest = true;
        response.body.supportsGotoTargetsRequest = true;

        this.clientDebugger.removeAllBreakPoints().then((value) => {
            if(value) {
                this.sendResponse(response);
                this.sendEvent(new InitializedEvent());
            }
            else {
                response.success = false;
                this.sendResponse(response);
            }
        });
    }

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request) {
        this.sendResponse(response);
    }

    protected attachRequest(response: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments, request?: DebugProtocol.Request) {
        this.sendResponse(response);
    }

    protected terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments, request?: DebugProtocol.Request) {
        this.sendResponse(response);
    }

    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request | undefined): void {
        this.sendEvent(new StoppedEvent('entry', 1));
    }

    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request) {
        if(args.lines && args.source.path) {
            this.clientDebugger.setBreakPointsRequest(args.lines, args.source.path).then((value) => {
                if(!value)
                    response.success = false;
                this.sendResponse(response);
            });
        }
        else
            this.sendResponse(response);
    }

    protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request): void {
		this.sendResponse(response);
	}

    protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request | undefined): void {
        this.clientDebugger.stop().then((value) => {
            if(!value)
                response.success = false;
            this.sendResponse(response);
            this.sendEvent(new StoppedEvent('stop', 1));
        });
    }

    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
        this.clientDebugger.run().then((value) => {
            if(!value)
                response.success = false;
            this.sendResponse(response);
        });
    }

    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('stop', 1));
    }

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request | undefined): void {
        this.clientDebugger.stepInRequest().then((value) => {
            if(!value)
                response.success = false;
            this.sendResponse(response);
            this.sendEvent(new StoppedEvent('stop', 1));
        });
    }

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request | undefined): void {
        this.sendResponse(response);
    }

    protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request | undefined): void {
        this.sendResponse(response);
        this.sendEvent(new StoppedEvent('entry', 1));
    }

    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
        this.sendResponse(response);
    }
    
	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
        this.clientDebugger.disconnect();
	}

    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
        this.clientDebugger.stackFrameRequest().then((frames) => {
            if(frames) {
                response.body = {
                    stackFrames: frames,
                    totalFrames: frames.length,
                };
                this.sendResponse(response);
            }
        });
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(1, 'thread 1'),
			]
		};
		this.sendResponse(response);
	}
}
