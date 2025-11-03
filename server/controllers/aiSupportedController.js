const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getTeamAISupported = async (req, res) => {
  try {
    const { teamid } = req.params;
    const aiSupported = await prisma.aISupported.findFirst({
      where: { teamId: teamid },
    });
    res.json({ enabled: !!aiSupported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setTeamAISupported = async (req, res) => {
    console.log('setTeamAISupported called with', req.params, req.body);
  try {
    const { teamid } = req.params;
    const { enabled } = req.body;

    const existing = await prisma.aISupported.findFirst({
      where: { teamId: teamid },
    });

    if (enabled) {
      if (!existing) {
        await prisma.aISupported.create({ data: { teamId: teamid } });
      }
    } else {
      if (existing) {
        await prisma.aISupported.delete({ where: { id: existing.id } });
      }
    }

    res.json({ enabled: !!enabled });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.createAISupported = async (req, res) => {
  try {
    const { teamId } = req.body;
    const aiSupported = await prisma.aISupported.create({
      data: { teamId },
    });
    res.status(201).json(aiSupported);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllAISupported = async (req, res) => {
  try {
    const aiSupported = await prisma.aISupported.findMany({
      include: { team: true },
    });
    res.json(aiSupported);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};