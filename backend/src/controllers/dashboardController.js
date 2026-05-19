const prisma = require('../prisma');

const getDashboardStats = async (req, res) => {
  try {
    const totalPatients = await prisma.patient.count();
    
    const activeCases = await prisma.medicalCase.count({
      where: { status: 'Active' }
    });

    const finishedCases = await prisma.medicalCase.count({
      where: { status: 'Finished' }
    });
    
    // Grouping by cancer type for charts
    const cancerDistributionData = await prisma.medicalCase.groupBy({
      by: ['cancerType'],
      _count: { cancerType: true }
    });

    const cancerDistribution = cancerDistributionData.map(c => ({
      name: c.cancerType,
      value: c._count.cancerType
    }));

    // Recent 5 patients
    const recentPatients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        nationalId: true,
        createdAt: true
      }
    });

    return res.json({
      metrics: {
        totalPatients,
        activeCases,
        finishedCases
      },
      cancerDistribution,
      recentPatients
    });

  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

module.exports = { getDashboardStats };
