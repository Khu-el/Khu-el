/**
 * A dependency-free validator for the subset of JSON Schema used by
 * `.neterverse/schemas/`.
 *
 * Why not a library: the bus has to be readable and runnable by any authorized
 * runtime with nothing installed. `npm install` is not a precondition for
 * validating shared state, and a validator that only understands the subset we
 * actually write is small enough to audit in one sitting.
 *
 * Supported: type (incl. union arrays and "integer"), enum, const, required,
 * properties, additionalProperties, items, minItems, minLength, maxLength,
 * pattern, format: date-time.
 *
 * Anything a schema asks for outside that set is reported as an error rather
 * than silently ignored - a validator that quietly skips a constraint is worse
 * than no validator, because it produces unearned confidence.
 */

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const SUPPORTED_KEYWORDS = new Set([
  '$schema', '$id', 'title', 'description', 'examples', 'default',
  'type', 'enum', 'const', 'required', 'properties', 'additionalProperties',
  'items', 'minItems', 'minLength', 'maxLength', 'pattern', 'format',
]);

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

type Schema = Record<string, unknown>;

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, expected: string): boolean {
  if (expected === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeOf(value) === expected;
}

function join(path: string, key: string | number): string {
  return typeof key === 'number' ? `${path}[${key}]` : path === '' ? key : `${path}.${key}`;
}

function check(value: unknown, schema: Schema, path: string, errors: ValidationError[]): void {
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      errors.push({ path, message: `schema uses unsupported keyword "${keyword}"` });
    }
  }

  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema['const'])) {
    errors.push({ path, message: `must equal ${JSON.stringify(schema['const'])}` });
  }

  if (Array.isArray(schema['enum'])) {
    const allowed = schema['enum'] as unknown[];
    if (!allowed.some((a) => JSON.stringify(a) === JSON.stringify(value))) {
      errors.push({ path, message: `must be one of ${allowed.map((a) => JSON.stringify(a)).join(', ')}` });
    }
  }

  const declaredType = schema['type'];
  if (typeof declaredType === 'string' || Array.isArray(declaredType)) {
    const allowed = (Array.isArray(declaredType) ? declaredType : [declaredType]) as string[];
    if (!allowed.some((t) => matchesType(value, t))) {
      errors.push({ path, message: `expected ${allowed.join(' or ')}, got ${typeOf(value)}` });
      // A wrong type makes every downstream constraint meaningless noise.
      return;
    }
  }

  if (typeof value === 'string') {
    const min = schema['minLength'];
    if (typeof min === 'number' && value.length < min) {
      errors.push({ path, message: `must be at least ${min} character(s)` });
    }
    const max = schema['maxLength'];
    if (typeof max === 'number' && value.length > max) {
      errors.push({ path, message: `must be at most ${max} character(s)` });
    }
    const pattern = schema['pattern'];
    if (typeof pattern === 'string' && !new RegExp(pattern).test(value)) {
      errors.push({ path, message: `must match ${pattern}` });
    }
    if (schema['format'] === 'date-time' && !DATE_TIME.test(value)) {
      errors.push({ path, message: 'must be an ISO-8601 date-time' });
    }
  }

  if (Array.isArray(value)) {
    const minItems = schema['minItems'];
    if (typeof minItems === 'number' && value.length < minItems) {
      errors.push({ path, message: `must have at least ${minItems} item(s)` });
    }
    const items = schema['items'];
    if (items && typeof items === 'object') {
      value.forEach((entry, i) => check(entry, items as Schema, join(path, i), errors));
    }
  }

  if (value !== null && typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>;
    const properties = (schema['properties'] as Record<string, Schema> | undefined) ?? undefined;

    const required = schema['required'];
    if (Array.isArray(required)) {
      for (const key of required as string[]) {
        if (!(key in obj)) errors.push({ path: join(path, key), message: 'is required' });
      }
    }

    if (properties) {
      for (const [key, sub] of Object.entries(properties)) {
        if (key in obj) check(obj[key], sub, join(path, key), errors);
      }
    }

    if (schema['additionalProperties'] === false) {
      const known = new Set(Object.keys(properties ?? {}));
      for (const key of Object.keys(obj)) {
        if (!known.has(key)) {
          errors.push({ path: join(path, key), message: 'is not an allowed property' });
        }
      }
    }
  }
}

export function validate(value: unknown, schema: Schema): ValidationResult {
  const errors: ValidationError[] = [];
  check(value, schema, '', errors);
  return { valid: errors.length === 0, errors };
}

/** Renders errors as one line each, for a CLI or a test failure message. */
export function formatErrors(errors: ValidationError[]): string {
  return errors.map((e) => `  ${e.path || '<root>'}: ${e.message}`).join('\n');
}
