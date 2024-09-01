import { config } from "..";

interface ErrorData {
  errorCode: number;
  errorMessage: string;
  messageVars?: (string | null)[];
  numericErrorCode: number;
  originatingService: string;
  intent: string;
  createdAt: string;
}

class ErrorManager {
  private errorData: ErrorData;

  constructor(errorData: ErrorData) {
    this.errorData = errorData;
  }

  setMessageVar(messageVar: string | null): this {
    if (this.errorData.messageVars) {
      this.errorData.messageVars.push(messageVar);
    }
    return this;
  }

  getError(): ErrorData {
    return this.errorData;
  }
}

export default class errors {
  private static errors: ErrorData[] = [];

  static createError(
    code: number,
    route: string | null,
    message: string,
    timestamp: string,
  ): ErrorManager | ErrorData {
    let sanitizedRoute: string | null = null;

    if (route !== null) {
      sanitizedRoute = route.replace(/^(https?:\/\/)?([a-zA-Z0-9.-]+)(:\d+)?/, "");
      sanitizedRoute = sanitizedRoute.replace(/.*\/fortnite/, "");
    }

    if (!sanitizedRoute) {
      return new ErrorManager({
        errorCode: code,
        errorMessage: message,
        messageVars: [],
        numericErrorCode: code,
        originatingService: "Chronos",
        intent: "prod-live",
        createdAt: timestamp,
      }).getError();
    }

    const errorData: ErrorData = {
      errorCode: code,
      errorMessage: message,
      messageVars: [sanitizedRoute],
      numericErrorCode: code,
      originatingService: "Chronos",
      intent: "prod-live",
      createdAt: timestamp,
    };
    this.errors.push(errorData);

    return new ErrorManager(errorData).getError();
  }

  static getErrors(): ErrorData[] {
    return this.errors;
  }

  static clearErrors(): void {
    this.errors = [];
  }
}
