import type { NextFunction, Request, Response } from 'express';
import { requireBearerHeader } from './require-bearer-header';

describe('requireBearerHeader', () => {
  const run = (authorization?: string) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn() as NextFunction;
    requireBearerHeader(
      { headers: { authorization } } as unknown as Request,
      { status } as unknown as Response,
      next,
    );
    return { status, json, next };
  };

  it('passes a request with a Bearer header on without checking the token', () => {
    const { next, status } = run('Bearer abc.def');
    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'Bearer', 'Basic abc', 'abc'])('rejects %p with 401', (header) => {
    const { next, status, json } = run(header);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
