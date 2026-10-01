import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, AGENT_VERSION } from './app.module';
import { AgentEnv } from './agent-env';
import { SetupPinService } from './setup/setup-pin.service';
import { networkInterfaces } from 'node:os';

async function bootstrap(): Promise<void> {
  const logger = new Logger('SiteAgent');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const env = app.get(AgentEnv);

  logger.log(`myNextScreen site agent ${AGENT_VERSION}`);

  if (env.setupPort === 0) {
    // An agent configured entirely through environment variables has no reason
    // to open a port at all, and some operators would rather it did not.
    logger.log('Setup interface disabled (MNS_SETUP_PORT=0)');
    await app.init();
    return;
  }

  await app.listen(env.setupPort, '0.0.0.0');
  app.get(SetupPinService).announce(`http://${primaryAddress()}:${env.setupPort}`);
}

/** Best-effort LAN address, only so the log line is something to click. */
function primaryAddress(): string {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return 'localhost';
}

void bootstrap();
