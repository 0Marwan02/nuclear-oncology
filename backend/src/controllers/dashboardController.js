const prisma = require('../prisma');

const SCAN_TYPE_LABELS = [
  { key: 'petct', label: 'PET/CT', route: '/scans/petct', color: '#7c3aed' },
  { key: 'psma', label: 'PSMA', route: '/scans/psma', color: '#ea580c' },
  { key: 'thyroid', label: 'Thyroid', route: '/scans/thyroid', color: '#16a34a' },
  { key: 'bone', label: 'Bone', route: '/scans/bone', color: '#2563eb' },
  { key: 'renal', label: 'Renal', route: '/scans/renal', color: '#0d9488' },
  { key: 'gastric', label: 'Gastric', route: '/scans/gastric', color: '#d97706' },
  { key: 'meckel', label: "Meckel's", route: '/scans/meckel', color: '#9333ea' },
  { key: 'cardiac', label: 'Cardiac (MPI)', route: '/scans/cardiac', color: '#ef4444' },
  { key: 'dynamic', label: 'Dynamic', route: '/scans', color: '#6366f1' },
];

const getDailyStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: today },
        tableName: {
          notIn: ['User', 'ScanTemplate', 'UserPermission']
        }
      },
      select: {
        userId: true,
        recordId: true,
      }
    });

    const myCases = new Set();
    const hospitalCases = new Set();

    logs.forEach(log => {
      hospitalCases.add(log.recordId);
      if (log.userId === req.user.id) {
        myCases.add(log.recordId);
      }
    });

    return res.json({
      myCasesToday: myCases.size,
      hospitalCasesToday: hospitalCases.size,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch daily stats', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalPatients,
      totalVisits,
      completedVisits,
      categoryDistributionData,
      recentPatients,
      petct, psma, thyroid, bone, renal, gastric, meckel, cardiac, dynamic,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.visit.count(),
      prisma.visit.count({ where: { workflowStatus: 'Completed' } }),
      prisma.visit.groupBy({ by: ['category'], _count: { category: true } }),
      prisma.patient.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.scanPETCT.count(),
      prisma.scanPSMAPETCT.count(),
      prisma.scanThyroid.count(),
      prisma.scanBone.count(),
      prisma.scanRenal.count(),
      prisma.scanGastric.count(),
      prisma.scanMeckel.count(),
      prisma.scanCardiac.count(),
      prisma.dynamicScan.count(),
    ]);

    const categoriesCount = categoryDistributionData.reduce((acc, curr) => {
      if (curr.category) acc[curr.category] = curr._count.category;
      return acc;
    }, {});

    const byType = { petct, psma, thyroid, bone, renal, gastric, meckel, cardiac, dynamic };
    const scanTypeDistribution = SCAN_TYPE_LABELS
      .map(({ key, label, route, color }) => ({
        key, label, route, color, value: byType[key] ?? 0,
      }))
      .filter((entry) => entry.value > 0);

    return res.json({
      totalPatients,
      totalVisits,
      completedVisits,
      categoriesCount,
      recentPatients,
      scanStats: { total: Object.values(byType).reduce((a, b) => a + b, 0), byType },
      scanTypeDistribution,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getDailyStats,
};
