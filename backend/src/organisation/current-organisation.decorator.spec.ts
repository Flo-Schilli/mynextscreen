import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentOrganisation } from './current-organisation.decorator';

// Helper to extract the factory function from a param decorator
function getParamDecoratorFactory() {
  class TestController {
    test(@CurrentOrganisation() _organisationId: string) {}
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

function createMockExecutionContext(
  headers: Record<string, string>,
  query: Record<string, string> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, query }),
    }),
  } as unknown as ExecutionContext;
}

describe('CurrentOrganisation decorator', () => {
  const factory = getParamDecoratorFactory();

  it('should extract organisationId from X-Organisation-Id header', () => {
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const ctx = createMockExecutionContext({ 'x-organisation-id': orgId });

    const result = factory(undefined, ctx);

    expect(result).toBe(orgId);
  });

  it('should extract organisationId from query parameter', () => {
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const ctx = createMockExecutionContext({}, { organisationId: orgId });

    const result = factory(undefined, ctx);

    expect(result).toBe(orgId);
  });

  it('should throw BadRequestException when neither header nor query param is provided', () => {
    const ctx = createMockExecutionContext({});

    expect(() => factory(undefined, ctx)).toThrow(BadRequestException);
    expect(() => factory(undefined, ctx)).toThrow('Missing organisation context');
  });

  it('should throw BadRequestException when header is empty string', () => {
    const ctx = createMockExecutionContext({ 'x-organisation-id': '' });

    expect(() => factory(undefined, ctx)).toThrow(BadRequestException);
  });
});
