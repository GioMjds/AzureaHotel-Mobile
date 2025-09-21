import chalk, { ChalkInstance } from 'chalk';

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
	SUCCESS = 'SUCCESS',
}

export interface LoggerOptions {
	timestamp?: boolean;
	level?: LogLevel;
	context?: string;
}

export class Logger {
	private static instance: Logger;
	private chalk: ChalkInstance;
	private options: LoggerOptions;

	private constructor(options: LoggerOptions = {}) {
		this.options = {
			timestamp: true,
			context: 'App',
			...options,
		};
		this.chalk = chalk;
	}

	public static getInstance(options?: LoggerOptions): Logger {
        if (options) return new Logger(options);

		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

    private getTimestamp(): string {
        const now = new Date();
        const date = now.toLocaleDateString('en-US');
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${date} ${hours}:${minutes} ${ampm}`;
    }

	private formatMessage(
		message: string,
		context?: string
	): string {
		const timestamp = this.options.timestamp
			? `[${this.getTimestamp()}] `
			: '';
		const logContext = context || this.options.context;
		const contextPart = logContext ? `[${logContext}]` : '';

		return `${timestamp}${contextPart} ${message}`;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels = Object.values(LogLevel);
		const currentLevelIndex = levels.indexOf(this.options.level!);
		const messageLevelIndex = levels.indexOf(level);
		return messageLevelIndex >= currentLevelIndex;
	}

	public debug(message: string, context?: string): void {
		if (!this.shouldLog(LogLevel.DEBUG)) return;

		const formatted = this.formatMessage(message, context);
		console.log(this.chalk.gray(formatted));
	}

	public info(message: string, context?: string): void {
		if (!this.shouldLog(LogLevel.INFO)) return;

		const formatted = this.formatMessage(message, context);
		console.log(this.chalk.blue(formatted));
	}

	public warn(message: string, context?: string): void {
		if (!this.shouldLog(LogLevel.WARN)) return;

		const formatted = this.formatMessage(message, context);
		console.log(this.chalk.yellow(formatted));
	}

	public error(message: string, context?: string): void {
		if (!this.shouldLog(LogLevel.ERROR)) return;

		const formatted = this.formatMessage(message, context);
		console.log(this.chalk.red(formatted));
	}

	public success(message: string, context?: string): void {
		if (!this.shouldLog(LogLevel.SUCCESS)) return;

		const formatted = this.formatMessage(message, context);
		console.log(this.chalk.green(formatted));
	}

	public http(message: string, context?: string): void {
		if (!this.shouldLog(LogLevel.INFO)) return;

		const formatted = this.formatMessage(`HTTP: ${message}`, context);
		console.log(this.chalk.cyan(formatted));
	}

	public setContext(context: string): void {
		this.options.context = context;
	}

	public enableTimestamp(): void {
		this.options.timestamp = true;
	}

	public disableTimestamp(): void {
		this.options.timestamp = false;
	}

	public getOptions(): LoggerOptions {
		return { ...this.options };
	}
}