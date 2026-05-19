const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminId = '9999';
  const existing = await prisma.user.findUnique({
    where: { hospitalId: adminId }
  });

  if (existing) {
    console.log(`Admin with ID ${adminId} already exists.`);
    return;
  }

  const hashedPassword = await bcrypt.hash('123', 10);
  
  await prisma.user.create({
    data: {
      hospitalId: adminId,
      name: 'System Admin',
      role: 'admin',
      password: hashedPassword
    }
  });

  console.log(`Successfully created Admin with ID ${adminId} and password 123`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
