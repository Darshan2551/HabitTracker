import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { FastifyInstance } from 'fastify';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { sendEmail } from '../utils/mailer.js';
import { sendWebPush } from '../utils/push.js';

dayjs.extend(utc);

const connection = new (IORedis as any)(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

type ReminderJob = {
  reminderId: string;
  userId: string;
  habitId: string;
  channel: 'EMAIL' | 'PUSH' | 'SMS';
};

export const reminderQueue = new Queue<ReminderJob>('habit-reminders', { connection });

export function startReminderWorker(fastify: FastifyInstance): Worker<ReminderJob> {
  return new Worker<ReminderJob>(
    'habit-reminders',
    async (job) => {
      const reminder = await fastify.prisma.reminder.findUnique({
        where: {
          id: job.data.reminderId,
        },
        include: {
          habit: true,
          user: true,
        },
      });

      if (!reminder || !reminder.enabled) {
        return;
      }

      if (job.data.channel === 'EMAIL') {
        await sendEmail({
          to: reminder.user.email,
          subject: `Reminder: ${reminder.habit.title}`,
          html: `<p>Time to work on <strong>${reminder.habit.title}</strong>.</p>`,
        });
      }

      if (job.data.channel === 'PUSH') {
        const subscriptions = await fastify.prisma.pushSubscription.findMany({
          where: {
            userId: reminder.userId,
          },
        });
        await Promise.all(
          subscriptions.map((subscription) =>
            sendWebPush(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              {
                title: 'Habit Reminder',
                body: `Time to complete ${reminder.habit.title}`,
                habitId: reminder.habitId,
              },
            ),
          ),
        );
      }

      if (job.data.channel === 'SMS') {
        fastify.log.warn(
          `SMS reminder requested for reminder=${reminder.id}. Configure SMS provider integration.`,
        );
      }

      await fastify.prisma.reminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          lastSentAt: new Date(),
        },
      });
    },
    { connection },
  );
}

export async function enqueueDueReminders(fastify: FastifyInstance): Promise<number> {
  const now = dayjs().utc();
  const minuteKey = now.format('HH:mm');
  const weekday = now.day();

  const reminders = await fastify.prisma.reminder.findMany({
    where: {
      enabled: true,
      timeOfDay: minuteKey,
      habit: {
        deletedAt: null,
      },
    },
  });

  let queued = 0;
  for (const reminder of reminders) {
    if (Array.isArray(reminder.days)) {
      const days = reminder.days as number[];
      if (!days.includes(weekday)) {
        continue;
      }
    }
    await reminderQueue.add(
      `reminder-${reminder.id}-${now.toISOString()}`,
      {
        reminderId: reminder.id,
        userId: reminder.userId,
        habitId: reminder.habitId,
        channel: reminder.channel,
      },
      {
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
    queued += 1;
  }

  return queued;
}
