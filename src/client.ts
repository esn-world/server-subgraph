import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient({
  errorFormat: 'pretty',
  datasources: {
    db: {
        url: `postgres://${process.env.AZURE_POSTGRESQL_USER}:${process.env.AZURE_POSTGRESQL_PASSWORD}@${process.env.AZURE_POSTGRESQL_HOST}/${process.env.AZURE_POSTGRESQL_DATABASE}?sslmode=require&connection_limit=15&pool_timeout=30`,
    }
  }
});
if (process.env.NODE_ENV !== 'production') {
  prisma.$use(async (params, next) => {
    const before = Date.now();

    const result = await next(params);

    const after = Date.now();

    console.log(
      `Query ${params.model}.${params.action} took ${after - before}ms (${
        Math.round((after - before) / 10) / 100
      }s)`
    );
    // console.log(JSON.stringify(params, null, 2));

    return result;
  });
}
export default prisma;
