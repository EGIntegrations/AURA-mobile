export class Logger {
  static info(message: string, details?: string): void {
    if (!__DEV__) return;
    if (details) {
      console.log(`[INFO] ${message}: ${details}`);
      return;
    }
    console.log(`[INFO] ${message}`);
  }

  static warn(message: string, details?: string): void {
    if (!__DEV__) return;
    if (details) {
      console.warn(`[WARN] ${message}: ${details}`);
      return;
    }
    console.warn(`[WARN] ${message}`);
  }

  static error(message: string, details?: string): void {
    if (__DEV__) {
      if (details) {
        console.error(`[ERROR] ${message}: ${details}`);
        return;
      }
      console.error(`[ERROR] ${message}`);
    }
  }

  static fromError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
