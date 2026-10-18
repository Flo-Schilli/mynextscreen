import { Controller, Post, Body, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import type { AddressInfo } from 'net';
import { registerBodyParsers } from './body-parsers';

const LICENSE_ROUTE = '/license-text';

@Controller()
class EchoController {
  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return { body };
  }

  @Post('license-text')
  licenseText(@Body() body: { text?: string }): { length: number } {
    return { length: body.text?.length ?? 0 };
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('registerBodyParsers', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(EchoModule, { bodyParser: false, logger: false });
    registerBodyParsers(app, { licenseTextRoute: LICENSE_ROUTE });
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  it('parses JSON bodies on routes outside the scoped parser', async () => {
    const res = await post('/echo', { a: 1 });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ body: { a: 1 } });
  });

  it('accepts a body above the default limit on the license text route', async () => {
    const res = await post(
      LICENSE_ROUTE,
      { text: 'x'.repeat(500_000) },
      { authorization: 'Bearer t' },
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ length: 500_000 });
  });

  it('rejects the license text route without a Bearer header', async () => {
    const res = await post(LICENSE_ROUTE, { text: 'x' });

    expect(res.status).toBe(401);
  });

  it('keeps the default limit on other routes', async () => {
    const res = await post('/echo', { text: 'x'.repeat(500_000) });

    expect(res.status).toBe(413);
  });
});
