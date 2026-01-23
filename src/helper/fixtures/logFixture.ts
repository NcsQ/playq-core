import { Logger, createLogger } from 'winston';
import { options } from '../util/logger';
import fs from 'fs';
import path from 'path';

let logger: Logger;

export const logFixture = {
  init(scenarioName: string): void {
    logger = createLogger(options(scenarioName));
  },
  get(): Logger {
    if (!logger) throw new Error("Logger not initialized!");
    return logger;
  },
  setLogger(log: Logger) {
    logger = log;
  },
  getLogger(): Logger {
    return logger;
  },
  async attach(name: string, data: Buffer, type: string = 'application/octet-stream') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = type.includes('png') ? 'png' : type.includes('jpg') ? 'jpg' : 'txt';
    const filename = `${timestamp}-${name.replace(/\s+/g, '_')}.${ext}`;
    const attachmentDir = path.resolve('logs', 'attachments');
    const filePath = path.join(attachmentDir, filename);

    fs.mkdirSync(attachmentDir, { recursive: true });
    fs.writeFileSync(filePath, data);

    logger.info(`📎 Attached file: ${filePath}`);
  }
};


// // src/hooks/logFixture.ts
// import { Logger, createLogger, format, transports } from 'winston';

// let logger: Logger;

// export const logFixture = {
//   init(scenarioName: string): void {
//     logger = createLogger({
//       level: 'info',
//       format: format.combine(
//         format.timestamp(),
//         format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
//       ),
//       transports: [new transports.Console()]
//     });
//   },
//   get(): Logger {
//     if (!logger) throw new Error("Logger not initialized!");
//     return logger;
//   }
// };