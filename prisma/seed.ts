import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const seedFile = path.join(__dirname, 'seed-data.json');
  
  if (!fs.existsSync(seedFile)) {
    console.log('No seed-data.json found. Skipping seed.');
    return;
  }

  const rawData = fs.readFileSync(seedFile, 'utf-8');
  const data = JSON.parse(rawData);

  console.log('Seeding database from local export...');

  // Using transactions or sequential creates to maintain relations
  for (const user of data.users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  for (const account of data.accounts) {
    await prisma.account.upsert({
      where: { id: account.id },
      update: {},
      create: account,
    });
  }

  for (const band of data.bands) {
    await prisma.band.upsert({
      where: { id: band.id },
      update: {},
      create: band,
    });
  }

  for (const member of data.bandMembers) {
    await prisma.bandMember.upsert({
      where: { id: member.id },
      update: {},
      create: member,
    });
  }

  for (const gig of data.gigs) {
    await prisma.gig.upsert({
      where: { id: gig.id },
      update: {},
      create: gig,
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
