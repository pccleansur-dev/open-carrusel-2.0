export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class InternalServerError extends ApplicationError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class BadGatewayError extends ApplicationError {
  constructor(message: string) {
    super(message, 502);
  }
}

export class ServiceUnavailableError extends ApplicationError {
  constructor(message: string) {
    super(message, 503);
  }
}
