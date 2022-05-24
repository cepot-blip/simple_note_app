import { PrismaClient } from "@prisma/client"

const ModelNote = new PrismaClient().note

export default ModelNote
