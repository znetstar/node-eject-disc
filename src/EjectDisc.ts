import { spawn, ChildProcess } from "child_process";
const winEject = require('win-eject');

export class UnsupportedPlatform extends Error {
    constructor() {
        super(`Platform ${process.platform} not supported`);
    }
}

export class Result {
    constructor(public code: number, public stdout: Buffer, public stderr: Buffer) {

    }
}

export class ExecutionError extends Error {
    constructor(public result: Result) {
        super(`Command exited with code ${result.code}`);
    }  
}

async function processCommand(child: ChildProcess): Promise<Result> {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (buf) => { stdout.push(buf); });
     
    return new Promise<Result>((resolve, reject) => {
        child.on("close", (code) => {
            const res = new Result(code, Buffer.from(stdout), Buffer.from(stderr));
            if (code !== 0) {
                reject(new ExecutionError(res));
            } else {
                resolve(res);
            }
        });
    });
}

/**
 * Contains functions to eject an optical disc.
 */
export default class EjectDisc {
    /**
     * Ejects an optical disc on MacOS.
     */
    public static async ejectMacOS(drive: string) {
        return await processCommand(spawn("drutil", ["tray", "eject", drive]));
    }

    /**
     * Ejects an optical disc on Windows.
     */
    public static async ejectWindows(drive: string) {
        return new Promise((resolve, reject) => {
            const fn = (err: Error) => {
                if (err) reject(err);
                else resolve();
            }

            winEject.eject.apply(winEject, [ drive, fn ].filter(Boolean));
        });
    }

    /**
     * Ejects an optical disc on Linux.
     */
    public static async ejectLinux(drive: string) {
        return await processCommand(spawn("eject", [ drive ]));
    }

    /**
     * Ejects an optical disc.
     */
    public static async eject(drive: string) {
       switch (process.platform) {
            case "win32": 
                return await EjectDisc.ejectWindows(drive);
            case "darwin": 
                return await EjectDisc.ejectMacOS(drive);
            case "linux": 
                return await EjectDisc.ejectLinux(drive);
            default:
                throw new UnsupportedPlatform();
       }
    }
}