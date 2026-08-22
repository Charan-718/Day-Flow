export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertFound<T>(value: T | null | undefined, message = 'Resource not found'): T {
  if (value == null) {
    throw new AppError(message, 'NOT_FOUND', 404);
  }
  return value;
}
