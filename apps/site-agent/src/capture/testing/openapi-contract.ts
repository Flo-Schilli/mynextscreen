import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';

/**
 * Validates data against the vendored `openapi.json` of the capture plugin.
 * Test support only: the agent itself does not load a schema at runtime.
 */

interface SchemaRef {
  $ref?: string;
}
interface Operation {
  requestBody?: { content: { 'application/json': { schema: SchemaRef } } };
  responses: Record<
    string,
    { $ref?: string; content?: { 'application/json': { schema: SchemaRef } } }
  >;
}
interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    responses: Record<string, Operation['responses'][string]>;
  };
}

export const openApiDocument = JSON.parse(
  readFileSync(join(__dirname, '..', 'openapi.json'), 'utf8'),
) as OpenApiDocument;

const ROOT_ID = 'https://capture-plugin.invalid/openapi.json';

const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
ajv.addSchema({ ...openApiDocument, $id: ROOT_ID });

/** `/v1/streams/<uuid>` becomes `/v1/streams/{streamId}`. */
export function templateFor(path: string): string {
  return path.replace(/^\/v1\/streams\/[^/]+$/, '/v1/streams/{streamId}');
}

function operation(method: string, path: string): Operation {
  const op = openApiDocument.paths[templateFor(path)]?.[method.toLowerCase()];
  if (!op) {
    throw new Error(`openapi.json does not document ${method} ${path}`);
  }
  return op as Operation;
}

function validateAgainst(schema: SchemaRef | undefined, value: unknown, what: string): void {
  const name = schema?.$ref?.split('/').pop();
  const validate = name ? ajv.getSchema(`${ROOT_ID}#/components/schemas/${name}`) : undefined;
  if (!name || !validate) {
    throw new Error(`${what}: schema is not a known component reference`);
  }
  if (!validate(value)) {
    throw new Error(`${what} violates ${name}: ${ajv.errorsText(validate.errors)}`);
  }
}

/** Throws unless the request body is documented for the route and matches its schema. */
export function assertRequestMatches(method: string, path: string, body: unknown): void {
  const schema = operation(method, path).requestBody?.content['application/json'].schema;
  validateAgainst(schema, body, `${method} ${path} request`);
}

/** Throws when the response is not documented or its body does not match the documented schema. */
export function assertResponseMatches(
  method: string,
  path: string,
  status: number,
  body: unknown,
): void {
  const documented = operation(method, path).responses[String(status)];
  if (!documented) {
    throw new Error(`${method} ${path} ${status} is not documented in openapi.json`);
  }
  const response = documented.$ref
    ? openApiDocument.components.responses[documented.$ref.split('/').pop() ?? '']
    : documented;
  const schema = response?.content?.['application/json'].schema;
  if (!schema) {
    if (body !== undefined) {
      throw new Error(`${method} ${path} ${status} must have no body`);
    }
    return;
  }
  validateAgainst(schema, body, `${method} ${path} ${status}`);
}
