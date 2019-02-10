import { spawn, ChildProcess } from "child_process";
import * as _fs from "fs";
import { join, sep } from "path";
import { tmpdir } from "os";

const fs = _fs.promises;

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
    public static async ejectMacOS() {
        return await processCommand(spawn("drutil", ["tray", "eject"]));
    }

    /**
     * Ejects an optical disc on Windows.
     */
    public static async ejectWindows() {
        /**
         * Script taken from https://bit.ly/2Bj6nIh
         */
        const script = `
            Set oWMP = CreateObject("WMPlayer.OCX.7")
            Set colCDROMs = oWMP.cdromCollection
            For i = 0 to colCDROMs.Count-1
            colCDROMs.Item(i).Eject
            next
            oWMP.close 
        `;

        const dir = await fs.mkdtemp(`${tmpdir}${sep}`);
        const ejectScript = join(dir, "eject.vbs");
        await fs.writeFile(ejectScript, script);
        
        await processCommand(spawn("cscript", [ ejectScript ]));
        await fs.unlink(ejectScript);
    }

    /**
     * Ejects an optical disc on Linux.
     */
    public static async ejectLinux() {
        return await processCommand(spawn("eject"));
    }

    /**
     * Ejects an optical disc.
     */
    public static async eject() {
       switch (process.platform) {
            case "win32": 
                return await EjectDisc.ejectWindows();
            case "darwin": 
                return await EjectDisc.ejectMacOS();
            case "linux": 
                return await EjectDisc.ejectLinux();
            default:
                throw new UnsupportedPlatform();
       }
    }
}