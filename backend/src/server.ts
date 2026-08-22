import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { flagMissingCheckouts } from './modules/attendance/attendance.service';

async function main() {
  const app = createApp();

  // Best-effort anomaly sweep on boot (deterministic rules)
  flagMissingCheckouts().catch((err) =>
    console.warn('[anomaly] startup sweep failed', err)
  );

  app.listen(env.PORT, () => {
    console.log(`Dayflow API listening on :${env.PORT}`);
  });
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
