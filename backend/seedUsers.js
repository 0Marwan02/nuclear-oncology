const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const USERS = [
  { hospitalId: 'ADM-001', name: 'د. أحمد سعيد', role: 'admin', password: 'admin123', nationalId: '29001011234567', phone: '01000000001', gender: 'Male', birthDate: new Date('1990-01-01') },
  { hospitalId: 'DOC-001', name: 'د. محمد عبدالرحمن', role: 'doctor', password: 'doc123', nationalId: '28505152345671', phone: '01100000001', gender: 'Male', birthDate: new Date('1985-05-15') },
  { hospitalId: 'DOC-002', name: 'د. فاطمة الزهراء', role: 'doctor', password: 'doc123', nationalId: '29003203456782', phone: '01100000002', gender: 'Female', birthDate: new Date('1990-03-20') },
  { hospitalId: 'DOC-003', name: 'د. خالد مصطفى', role: 'doctor', password: 'doc123', nationalId: '28811104567893', phone: '01100000003', gender: 'Male', birthDate: new Date('1988-11-10') },
  { hospitalId: 'NRS-001', name: 'نورهان أحمد', role: 'nurse', password: 'nurse123', nationalId: '29507085678904', phone: '01200000001', gender: 'Female', birthDate: new Date('1995-07-08') },
  { hospitalId: 'NRS-002', name: 'سارة محمود', role: 'nurse', password: 'nurse123', nationalId: '29612126789015', phone: '01200000002', gender: 'Female', birthDate: new Date('1996-12-12') },
  { hospitalId: 'TEC-001', name: 'عمرو حسن', role: 'technician', password: 'tech123', nationalId: '29208177890121', phone: '01500000001', gender: 'Male', birthDate: new Date('1992-08-17') },
  { hospitalId: 'TEC-002', name: 'مصطفى كمال', role: 'technician', password: 'tech123', nationalId: '29109238901231', phone: '01500000002', gender: 'Male', birthDate: new Date('1991-09-23') },
  { hospitalId: 'REC-001', name: 'هدى عبدالله', role: 'reception', password: 'rec123', nationalId: '29404019012342', phone: '01000000010', gender: 'Female', birthDate: new Date('1994-04-01') },
  { hospitalId: 'REC-002', name: 'منى السيد', role: 'reception', password: 'rec123', nationalId: '29706150123452', phone: '01000000011', gender: 'Female', birthDate: new Date('1997-06-15') },
  { hospitalId: 'BLK-001', name: 'حسام إبراهيم', role: 'nurse', password: 'blk123', nationalId: '29302281234561', phone: '01200000099', gender: 'Male', birthDate: new Date('1993-02-28'), isActive: false },
];

async function seedUsers() {
  console.log('👥 Seeding users...');
  const created = {};
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { hospitalId: u.hospitalId } });
    if (existing) { created[u.hospitalId] = existing.id; console.log(`  ⏩ ${u.hospitalId} exists`); continue; }
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.create({
      data: { hospitalId: u.hospitalId, name: u.name, role: u.role, password: hashed, nationalId: u.nationalId, phone: u.phone, gender: u.gender, birthDate: u.birthDate, isActive: u.isActive !== false }
    });
    created[u.hospitalId] = user.id;
    console.log(`  ✅ ${u.hospitalId} - ${u.name} (${u.role})`);
  }
  return created;
}

module.exports = { seedUsers, prisma };

if (require.main === module) {
  seedUsers().then(() => { console.log('\n✅ Users seeded!'); prisma.$disconnect(); }).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
}
