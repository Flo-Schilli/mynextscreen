"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
require("dotenv/config");
exports.default = new typeorm_1.DataSource({
    type: 'better-sqlite3',
    database: process.env.DATABASE_PATH || './data/signage.db',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
});
//# sourceMappingURL=data-source.js.map