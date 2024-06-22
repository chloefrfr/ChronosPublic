import chalk, { type ChalkInstance } from "chalk";

export enum LogLevel {
  STARTUP = "STARTUP",
  INFO = "INFO",
  DEBUG = "DEBUG",
  WARN = "WARN",
  ERROR = "ERROR",
}

type OptionalArgs = {
  [key: string]: any;
};

export default class Logger {
  private logLevel: LogLevel;

  constructor(logLevel?: LogLevel) {
    this.logLevel = logLevel || LogLevel.INFO;
  }

  private log(
    message: string,
    level: LogLevel,
    func: ChalkInstance,
    optionalArgs?: OptionalArgs
  ) {
    if (this.shouldLog(level)) {
      const formattedMessage = optionalArgs
        ? `${message} ${JSON.stringify(optionalArgs)}`
        : message;
      console.log(
        chalk.white(`[${func(level)}]`),
        chalk.gray(formattedMessage)
      );
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevel !== LogLevel.ERROR || level === LogLevel.ERROR;
  }

  public startup(message: string, optionalArgs?: OptionalArgs) {
    this.log(message, LogLevel.STARTUP, chalk.blue, optionalArgs);
  }

  public info(message: string, optionalArgs?: OptionalArgs) {
    this.log(message, LogLevel.INFO, chalk.green, optionalArgs);
  }

  public debug(message: string, optionalArgs?: OptionalArgs) {
    this.log(message, LogLevel.DEBUG, chalk.cyan, optionalArgs);
  }

  public warn(message: string, optionalArgs?: OptionalArgs) {
    this.log(message, LogLevel.WARN, chalk.yellow, optionalArgs);
  }

  public error(message: string, optionalArgs?: OptionalArgs) {
    this.log(message, LogLevel.ERROR, chalk.red, optionalArgs);
  }
}
