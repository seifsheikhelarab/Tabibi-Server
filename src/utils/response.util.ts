import { type Response } from 'express';

export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500
}

export enum ErrorCode {
    INVALID_CREDENTIALS = 'AUTH_OO1',
    USER_NOT_FOUND = 'AUTH_OO2',
    USER_ALREADY_EXISTS = 'AUTH_OO3',
    INVALID_TOKEN = 'AUTH_OO4',
    VALIDATION_ERROR = 'VAL_OO1',
    INVALID_INPUT = 'VAL_OO2',
    MISSING_INPUT = 'VAL_OO3',
    RESOURCE_NOT_FOUND = 'RES_OO1',
    RESOURCE_ALREADY_EXISTS = 'RES_OO2',
    RESOURCE_CONFLICT = 'RES_OO3',
    SERVER_ERROR = 'SRV_OO1',
    NOT_IMPLEMENTED = 'SRV_OO2',
    DATABASE_ERROR = 'SRV_OO3',
    RATE_LIMIT_EXCEEDED = 'SRV_OO4'
}

export class ResponseHandler {
    static success<T>(res: Response, data: T): Response {
        if (data && typeof data === 'object' && 'data' in data && 'pagination' in data) {
            return res.status(HttpStatus.OK).json(data);
        }
        if (data && typeof data === 'object' && 'success' in data) {
            return res.status(HttpStatus.OK).json(data);
        }
        return res.status(HttpStatus.OK).json({ success: true, ...(typeof data === 'object' ? data : { data }) });
    }

    static created<T>(res: Response, data: T): Response {
        if (data && typeof data === 'object' && 'success' in data) {
            return res.status(HttpStatus.CREATED).json(data);
        }
        return res.status(HttpStatus.CREATED).json({ success: true, ...(typeof data === 'object' ? data : { data }) });
    }

    static noContent(res: Response): Response {
        return res.status(HttpStatus.NO_CONTENT).send();
    }

    static badRequest(res: Response, message: string): Response {
        return res.status(HttpStatus.BAD_REQUEST).json({
            message,
            code: ErrorCode.VALIDATION_ERROR,
            status: HttpStatus.BAD_REQUEST
        });
    }

    static paginated<T>(
        res: Response,
        data: T[],
        page: number,
        limit: number,
        total: number
    ): Response {
        return res.status(HttpStatus.OK).json({
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    }

    static error(
        res: Response,
        message: string,
        code: ErrorCode,
        status: HttpStatus,
        path?: string,
        details?: Record<string, unknown>
    ): Response {
        return res.status(status).json({
            message,
            code,
            status,
            path,
            details
        });
    }
}

export class AppError extends Error {
    public status: HttpStatus;
    public code: ErrorCode | string;
    public details?: Record<string, unknown>;

    constructor(
        message: string,
        status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode | string = ErrorCode.SERVER_ERROR,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class AuthenticationError extends AppError {
    constructor(
        message = 'Invalid credentials',
        status = HttpStatus.UNAUTHORIZED,
        code = ErrorCode.INVALID_CREDENTIALS
    ) {
        super(message, status, code);
    }
}

export class AuthorizationError extends AppError {
    constructor(
        message = 'Insufficient permissions',
        status = HttpStatus.FORBIDDEN,
        code = ErrorCode.INVALID_INPUT
    ) {
        super(message, status, code);
    }
}

export class NotFoundError extends AppError {
    constructor(
        message = 'Resource not found',
        status = HttpStatus.NOT_FOUND,
        code = ErrorCode.RESOURCE_NOT_FOUND
    ) {
        super(message, status, code);
    }
}

export class BadRequestError extends AppError {
    constructor(
        message = 'Bad request',
        status = HttpStatus.BAD_REQUEST,
        code = ErrorCode.INVALID_INPUT
    ) {
        super(message, status, code);
    }
}

export class ValidationError extends BadRequestError {
    constructor(message = 'Validation failed') {
        super(message, HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }
}

export class ConfigurationError extends AppError {
    constructor(message = 'Service configuration error', details?: Record<string, unknown>) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SERVER_ERROR, details);
    }
}