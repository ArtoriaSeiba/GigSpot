import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Exporting local database data...');
  
  const users = await prisma.user.findMany();
  const accounts = await prisma.account.findMany();
  const bands = await prisma.band.findMany();
  const bandMembers = await prisma.bandMember.findMany();
  const gigs = await prisma.gig.findMany();
  
  const data = {
    users,
    accounts,
    bands,
    bandMembers,
    gigs
  };
  
  const outputPath = path.join(__dirname, '../prisma/seed-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`Successfully exported data to ${outputPath}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
