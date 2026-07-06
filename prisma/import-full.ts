import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const seedFile = path.join(__dirname, 'seed-data-full.json');
  
  if (!fs.existsSync(seedFile)) {
    console.log('No seed-data-full.json found.');
    return;
  }

  const rawData = fs.readFileSync(seedFile, 'utf-8');
  const data = JSON.parse(rawData);

  console.log('Seeding full database into remote Aiven...');

  for (const item of data.users) await prisma.user.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.accounts) await prisma.account.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.bands) await prisma.band.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.bandMembers) await prisma.bandMember.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.gigs) await prisma.gig.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.songs) await prisma.song.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.setlists) await prisma.setlist.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.setlistSongs) await prisma.setlistSong.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.gear) await prisma.gear.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.bandInvites) await prisma.bandInvite.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.financeTransactions) await prisma.financeTransaction.upsert({ where: { id: item.id }, update: {}, create: item });
  for (const item of data.tasks) await prisma.task.upsert({ where: { id: item.id }, update: {}, create: item });

  console.log('Full Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
