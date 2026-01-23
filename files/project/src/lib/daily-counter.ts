import { prisma } from "@/lib/prisma";

/**
 * Get next daily sequence number
 */
export async function getDailySequence(
  organizationId: string
): Promise<number> {
  const settings = await prisma.systemSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    throw new Error("SystemSettings not found");
  }

  // Increment sequence
  const newSequence = (settings.currentDailySequence || 0) + 1;

  // Update in database
  await prisma.systemSettings.update({
    where: { organizationId },
    data: {
      currentDailySequence: newSequence,
    },
  });

  return newSequence;
}

/**
 * Reset daily sequence if past cut-off time
 */
export async function resetDailySequenceIfNeeded(
  organizationId: string
): Promise<boolean> {
  const settings = await prisma.systemSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) return false;

  const now = new Date();
  const lastCutOff = settings.lastCutOffTime
    ? new Date(settings.lastCutOffTime)
    : null;

  // Get today's cut-off time
  const todayCutOff = new Date();
  todayCutOff.setHours(
    settings.dailyCutOffHour || 23,
    settings.dailyCutOffMinute || 59,
    0,
    0
  );

  // Get yesterday's cut-off time
  const yesterdayCutOff = new Date(todayCutOff);
  yesterdayCutOff.setDate(yesterdayCutOff.getDate() - 1);

  // Determine which cut-off to check against
  const relevantCutOff = now >= todayCutOff ? todayCutOff : yesterdayCutOff;

  // If no last cut-off or we've passed the relevant cut-off, reset
  const shouldReset =
    !lastCutOff || lastCutOff.getTime() < relevantCutOff.getTime();

  if (shouldReset) {
    await prisma.systemSettings.update({
      where: { organizationId },
      data: {
        currentDailySequence: 0,
        lastCutOffTime: relevantCutOff,
      },
    });

    console.log(
      `Daily sequence reset for org ${organizationId} at ${relevantCutOff}`
    );
    return true;
  }

  return false;
}

/**
 * Manually reset daily sequence (called by daily summary)
 */
export async function manualResetDailySequence(
  organizationId: string
): Promise<void> {
  await prisma.systemSettings.update({
    where: { organizationId },
    data: {
      currentDailySequence: 0,
      lastCutOffTime: new Date(),
    },
  });

  console.log(`Daily sequence manually reset for org ${organizationId}`);
}
