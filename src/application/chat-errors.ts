import { ApplicationError } from "./errors";

export class ServiceUnavailableError extends ApplicationError {
  constructor(message: string) {
    super(message, 503);
  }
}
