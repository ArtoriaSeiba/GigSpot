import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Exporting all data from local database...');

  const data = {
    users: await prisma.user.findMany(),
    accounts: await prisma.account.findMany(),
    bands: await prisma.band.findMany(),
    bandMembers: await prisma.bandMember.findMany(),
    gigs: await prisma.gig.findMany(),
    setlists: await prisma.setlist.findMany(),
    songs: await prisma.song.findMany(),
    setlistSongs: await prisma.setlistSong.findMany(),
    gear: await prisma.gear.findMany(),
    bandInvites: await prisma.bandInvite.findMany(),
    financeTransactions: await prisma.financeTransaction.findMany(),
    tasks: await prisma.task.findMany(),
  };

  const seedFile = path.join(__dirname, 'seed-data-full.json');
  fs.writeFileSync(seedFile, JSON.stringify(data, null, 2));

  console.log('Export complete! Wrote to seed-data-full.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
