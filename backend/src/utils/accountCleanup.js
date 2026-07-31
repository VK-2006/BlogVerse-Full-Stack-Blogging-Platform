import prisma from "./prisma.js";
import { removeStoredPostFiles } from "./fileStorage.js";

export async function purgeExpiredAccounts() {
  const now = new Date();
  const expiredUsers = await prisma.user.findMany({
    where: {
      deletionScheduledFor: { lte: now }
    },
    select: {
      id: true,
      email: true,
      posts: {
        select: {
          attachments: { select: { storedName: true } }
        }
      }
    }
  });

  for (const user of expiredUsers) {
    const attachments = user.posts.flatMap((post) => post.attachments);
    await prisma.user.delete({ where: { id: user.id } });
    await removeStoredPostFiles(attachments);
    console.log(`Deleted expired account ${user.email}.`);
  }

  return expiredUsers.length;
}

export function startAccountCleanupJob() {
  const run = () => {
    purgeExpiredAccounts().catch((error) => {
      console.error("Scheduled account cleanup failed:", error);
    });
  };

  run();
  const timer = setInterval(run, 15 * 60 * 1000);
  timer.unref?.();
  return timer;
}
