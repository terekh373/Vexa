import type { Prisma } from '@prisma/client';

/**
 * Recounts Course.studentsCount and the author's AuthorProfile.studentsCount.
 * Lives in lib/ because both payments (paid enrollment) and learning (free
 * enrollment) need it, and payments must not import learning. A recount
 * rather than an increment: it is idempotent and repairs any drift.
 */
export async function refreshStudentCounters(tx: Prisma.TransactionClient, courseId: string): Promise<void> {
  const course = await tx.course.findUnique({ where: { id: courseId }, select: { authorId: true } });
  if (course === null) return;

  const courseStudents = await tx.enrollment.count({ where: { courseId, revokedAt: null } });
  await tx.course.update({ where: { id: courseId }, data: { studentsCount: courseStudents } });

  const distinctStudents = await tx.enrollment.findMany({
    where: { revokedAt: null, course: { authorId: course.authorId, deletedAt: null } },
    distinct: ['userId'],
    select: { userId: true },
  });

  // The author may have no profile row, hence updateMany.
  await tx.authorProfile.updateMany({
    where: { userId: course.authorId },
    data: { studentsCount: distinctStudents.length },
  });
}
