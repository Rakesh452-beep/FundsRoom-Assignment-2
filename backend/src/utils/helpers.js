const AuditLog = {
  async record(prisma, { actorId, action, entity, entityId, before, after, quotationId, dispatchId }) {
    await prisma.auditLog.create({
      data: { actorId, action, entity, entityId, before, after, quotationId, dispatchId },
    });
  },
};

module.exports = { AuditLog };
