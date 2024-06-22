import { config } from "..";

interface ErrorData {
  errorCode: number;
  errorMessage: string;
  messageVars?: string[] | null[];
  numericErrorCode: number;
  originatingService: string;
  intent: string;
  createdAt: string;
  // severity: ErrorSeverity;
}

export default class errors {
  private static errors: ErrorData[] = [];

  static createError(
    code: number,
    route: string | null,
    message: string,
    timestamp: string,
  ): ErrorData {
    let sanitizedRoute: string | null = null;
    if (route !== null) sanitizedRoute = route.replace(/.*\/fortnite/, "");

    const errorData: ErrorData = {
      errorCode: code,
      errorMessage: message,
      messageVars: [sanitizedRoute as any],
      numericErrorCode: code,
      originatingService: "Chronos",
      intent: "prod-live",
      createdAt: timestamp,
    };
    this.errors.push(errorData);

    return errorData;
  }

  static getErrors(): ErrorData[] {
    return this.errors;
  }

  static clearErrors(): void {
    this.errors = [];
  }
}
