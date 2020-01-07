import {PrefixedLogger} from "../PrefixedLogger";

/**
 * A logger that doesn't output anything but instead just stores the messages in memory.
 */
export class MemoryLogger extends PrefixedLogger
{
    private lines: string[] = [];


    /**
     * Don't output the lines, but just store them in memory.
     */
    protected output (message: string): void
    {
        this.lines.push(message);
    }

    /**
     * Returns the complete output.
     */
    public getOutput (): string
    {
        return this.lines.join("\n");
    }
}
