const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const existing = await prisma.account.findFirst({ where: { providerAccountId: '12345' } });
    if (existing) await prisma.account.delete({ where: { id: existing.id } });

    await prisma.account.create({
      data: {
        userId: 'cmr0pmduz0000eri9gicz0f7l',
        type: 'oauth',
        provider: 'google',
        providerAccountId: '12345',
        access_token: 'dummy',
        expires_at: 12345,
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
        id_token: 'dummy'
      }
    });
    console.log('Account created successfully');
    await prisma.account.deleteMany({ where: { providerAccountId: '12345' }});
  } catch (e) {
    console.error('Error creating account:', e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
