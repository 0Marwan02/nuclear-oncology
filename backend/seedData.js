const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding minimal users...');
  const password = await bcrypt.hash('123456', 10);
  
  await prisma.user.upsert({
    where: { hospitalId: 'ADMIN01' },
    update: {},
    create: { hospitalId: 'ADMIN01', name: 'Admin', role: 'admin', password },
  });
  await prisma.user.upsert({
    where: { hospitalId: 'DOC01' },
    update: {},
    create: { hospitalId: 'DOC01', name: 'Doctor One', role: 'doctor', password },
  });
  await prisma.user.upsert({
    where: { hospitalId: 'NURSE01' },
    update: {},
    create: { hospitalId: 'NURSE01', name: 'Nurse One', role: 'nurse', password },
  });
  await prisma.user.upsert({
    where: { hospitalId: 'TECH01' },
    update: {},
    create: { hospitalId: 'TECH01', name: 'Tech One', role: 'technician', password },
  });
  console.log('Done seeding users.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
