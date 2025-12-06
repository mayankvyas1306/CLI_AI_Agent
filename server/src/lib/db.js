import { PrismaClient } from "@prisma/client";

const globalForPrisma=global
const prisma = new PrismaClient();

if(process.env.Node_ENV!=="production" ) globalForPrisma.prisma=prisma;

export default prisma;