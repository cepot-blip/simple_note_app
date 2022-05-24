import { PrismaClient } from "@prisma/client"

const ModelAdmin = new PrismaClient().admin

export default ModelAdmin
