import { ErrorRequestHandler, RequestHandler, Request } from '@novice1/routing'
import Extend from 'extend';
import Logger from '@novice1/logger'
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core'
import { IncomingHttpHeaders } from 'http';
import Zod, { core, ZodObject, ZodType } from 'zod/v4'

const Log = Logger.debugger('@novice1/validator-zod');
const PARAMETERS_PROPS = ['params', 'body', 'query', 'headers', 'cookies', 'files'];

interface ValidationObject {
    params?: ParamsDictionary;
    body?: unknown;
    query?: ParsedQs;
    headers?: IncomingHttpHeaders;
    cookies?: unknown;
    files?: unknown;
}

function retrieveParametersValue(parameters?: Record<string, unknown>, property?: string): ZodType | Record<string, unknown> | null {
    let schemaFromParameters: Record<string, unknown> | null = null;
    if (
        parameters &&
        typeof parameters === 'object'
    ) {
        schemaFromParameters = parameters;
        if (property && typeof property === 'string') {
            // retrieve nested object property
            const subParameters = property.replace(/\[([^[\]]*)\]/g, '.$1.')
                .split('.')
                .filter((t) => t !== '')
                .reduce((prev: unknown, curr) => {
                    if (prev && typeof prev === 'object' && curr in prev) {
                        const tmp: unknown = prev[curr as keyof typeof prev]
                        return tmp
                    }
                    return
                }, schemaFromParameters);
            if (
                subParameters &&
                typeof subParameters === 'object' &&
                !Array.isArray(subParameters)
            ) {
                schemaFromParameters = subParameters as Record<string, unknown>;
            } else {
                schemaFromParameters = null;
            }
        }
    }
    return schemaFromParameters;
}

function isSchema(x: unknown): x is ZodType {
    return (x instanceof ZodType)
}

function retrieveSchema(parameters?: Record<string, unknown>, property?: string): ZodType | null {
    const v = retrieveParametersValue(parameters, property);
    if (v) {
        let schema: ZodType | null = null
        let tempValue = v
        // check if schema is a valid schema
        if (tempValue) {
            // if it is not a ZodType
            if (!isSchema(tempValue)) {
                const tmpSchema: Record<string, ZodType> = {};
                const currentSchema: Record<string, ZodType> = tempValue as Record<string, ZodType>;
                PARAMETERS_PROPS.forEach((p) => {
                    if (currentSchema[p] && typeof currentSchema[p] === 'object') {
                        const currentSchemaValue = currentSchema[p]
                        if (isSchema(currentSchemaValue))
                            tmpSchema[p] = currentSchemaValue;
                        else {
                            tmpSchema[p] = Zod.object(currentSchemaValue);
                        }
                    }
                });
                if (Object.keys(tmpSchema).length) {
                    tempValue = Zod.object(tmpSchema);
                } else {
                    tempValue = tmpSchema;
                }
            }

            // if it is a ZodType
            if (isSchema(tempValue)) {
                schema = tempValue;
            }
        }
        return schema
    }
    return v

}

function buildValueToValidate(schema: ZodType, req: Request): ValidationObject {
    const r: ValidationObject = {};    //'params', 'body', 'query', 'headers', 'cookies', 'files'
    if ('shape' in schema.def && schema.def.shape && typeof schema.def.shape === 'object') {
        const properties = schema.def.shape
        if ('params' in properties) {
            r.params = req.params;
        }
        if ('body' in properties) {
            r.body = req.body;
        }
        if ('query' in properties) {
            r.query = req.query;
        }
        if ('headers' in properties) {
            r.headers = req.headers;
        }
        if ('cookies' in properties) {
            r.cookies = req.cookies;
        }
        if ('files' in properties) {
            r.files = req.files;
        }
    }
    return r;
}

export type ValidatorZodSchema = ZodObject | {
    body?: ZodType | { [x: string]: ZodType }
    headers?: ZodType | { [x: string]: ZodType }
    cookies?: ZodType | { [x: string]: ZodType }
    params?: ZodType | { [x: string]: ZodType }
    query?: ZodType | { [x: string]: ZodType }
    files?: ZodType | { [x: string]: ZodType }
}

export type ValidatorZodOptions = core.ParseContext<core.$ZodIssue>

export interface ValidatedFunction { 
    <Q = Record<string, unknown>, P = unknown, B = unknown, H = unknown, C = unknown, F = unknown>(): {
        query?: Q
        params?: P
        body?: B
        headers?: H
        cookies?: C
        files?: F
        [x: string]: unknown
      }
}

export function validatorZod(
    options?: ValidatorZodOptions,
    onerror?: ErrorRequestHandler,
    schemaProperty?: string
): RequestHandler {
    return async function validatorZodRequestHandler(req, res, next) {
        const schema = retrieveSchema(req.meta?.parameters, schemaProperty);
        if (!schema) {
            Log.silly('no schema to validate');
            return next();
        }
        const values = buildValueToValidate(schema, req);

        Log.info('validating %O', values);

        // validate schema
        return schema.parseAsync?.(values, req.meta.parameters?.validatorZodOptions ?
            req.meta.parameters?.validatorZodOptions :
            options).then(
        (validated) => {
          Log.info('Valid request for %s', req.originalUrl);

          // because 'query' is readonly since Express v5
          const { query, ...validatedProps } = validated as Record<PropertyKey, unknown>
          Log.debug('Validated query %o', query);

          req.validated = (() => validated) as ValidatedFunction

          Extend(req, validatedProps);
          next();
        },
        (err) => {
          Log.error('Invalid request for %s', req.originalUrl);
          if (typeof req.meta.parameters?.onerror === 'function') {
            Log.error(
              'Custom function onerror => %s',
              req.meta.parameters.onerror.name
            );
            return req.meta.parameters.onerror(err, req, res, next);
          }
          if (onerror) {
            if (typeof onerror === 'function') {
              Log.error('Custom function onerror => %s', onerror.name);
              return onerror(err, req, res, next);
            } else {
              Log.warn(
                'Expected arg 2 ("onerror") to be a function (ErrorRequestHandler). Instead got type "%s"',
                typeof onerror
              );
            }
          }
          return res.status(400).json(err);
        }
      );
    }
}