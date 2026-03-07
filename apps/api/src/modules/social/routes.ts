import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const socialRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/snapshots',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const payload = z
        .object({
          habitId: z.string().uuid().optional(),
          title: z.string().min(3).max(120),
          payload: z.record(z.any()),
          expiresAt: z.coerce.date().optional(),
        })
        .parse(request.body);

      const snapshot = await fastify.prisma.publicSnapshot.create({
        data: {
          userId: request.user.sub,
          habitId: payload.habitId,
          title: payload.title,
          payload: payload.payload,
          expiresAt: payload.expiresAt,
        },
      });

      return reply.code(201).send({
        snapshotId: snapshot.id,
        shareUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/share/${snapshot.id}`,
      });
    },
  );

  fastify.get('/snapshots/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const snapshot = await fastify.prisma.publicSnapshot.findUnique({
      where: { id: params.id },
    });
    if (!snapshot) {
      return reply.code(404).send({ message: 'Snapshot not found' });
    }

    if (snapshot.expiresAt && snapshot.expiresAt < new Date()) {
      return reply.code(410).send({ message: 'Snapshot expired' });
    }

    return reply.send({
      snapshot: {
        id: snapshot.id,
        title: snapshot.title,
        payload: snapshot.payload,
        createdAt: snapshot.createdAt,
      },
    });
  });

  fastify.post(
    '/follow/:userId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const params = z.object({ userId: z.string().uuid() }).parse(request.params);
      if (params.userId === request.user.sub) {
        return reply.code(400).send({ message: 'Cannot follow yourself' });
      }
      await fastify.prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: request.user.sub,
            followingId: params.userId,
          },
        },
        update: {},
        create: {
          followerId: request.user.sub,
          followingId: params.userId,
        },
      });
      return reply.send({ message: 'Following user' });
    },
  );

  fastify.get('/leaderboard', async (_request, reply) => {
    const completions = await fastify.prisma.completion.groupBy({
      by: ['userId'],
      where: {
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 20,
    });

    const userIds = completions.map((item) => item.userId);
    const users = await fastify.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
        publicProfileEnabled: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    const leaderboard = completions
      .map((entry) => {
        const user = userMap.get(entry.userId);
        if (!user) {
          return null;
        }
        return {
          userId: user.id,
          name: user.name ?? user.email.split('@')[0],
          completions: entry._count._all,
        };
      })
      .filter(Boolean);

    return reply.send({ leaderboard });
  });
};
