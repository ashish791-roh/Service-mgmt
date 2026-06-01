import type { Prisma } from '@prisma/client';

export type JobWithRelations = Prisma.JobGetPayload<{
  include: { activities: true; photos: true };
}>;

export type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: { jobs: true; devices: true };
}>;
