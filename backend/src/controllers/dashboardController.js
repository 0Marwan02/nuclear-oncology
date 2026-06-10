const prisma = require('../prisma');

const getDashboardStats = async (req, res) => {
  try {
    const totalPatients = await prisma.patient.count();
    const totalVisits = await prisma.visit.count();
    const completedVisits = await prisma.visit.count({
      where: { workflowStatus: 'Completed' }
    });

    const categoryDistributionData = await prisma.visit.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    const categoriesCount = categoryDistributionData.reduce((acc, curr) => {
      if (curr.category) {
        acc[curr.category] = curr._count.category;
      }
      return acc;
    }, {});

    const recentPatients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return res.json({
      totalPatients,
      totalVisits,
      completedVisits,
      categoriesCount,
      recentPatients
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

module.exports = {
  getDashboardStats
};
