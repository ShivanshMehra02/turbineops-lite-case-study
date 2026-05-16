export class HttpError extends Error {
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'HttpError';
    }
}
export function isHttpError(err) {
    return err instanceof HttpError;
}
