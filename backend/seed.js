const { seedUsers, prisma } = require('./seedUsers');

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Nuclear Oncology — Full Seed Script  ║');
  console.log('╚══════════════════════════════════════╝\n');

  await seedUsers();
  console.log('\n--- Users done. Now seeding data... ---\n');
  
  // Run data seed
  require('./seedData');
}

main().catch(e => { console.error(e); process.exit(1); });
