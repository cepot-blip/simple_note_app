import express from "express"
import cors from "cors"
import path from "path"
import env from "dotenv"
env.config()
const app = express()
const PORT = process.env.PORT
import { rateLimit } from "express-rate-limit"
import admin_routes from "./routes/admin_routes"
import helmet from "helmet"

app.use(
	cors({
		origin: "*",
	})
)

app.use(
	helmet({
		crossOriginResourcePolicy: false,
	})
)

const limiter = rateLimit({
	windowMs: 15 * 1000, //15 minute
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: "Too much pressing the screen please wait a while longer !!",
})

app.use((req, res, next) => {
	req.headers["access-control-allow-origin"] = "*"
	req.headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE"
	req.headers["access-control-allow-headers"] = "Content-Type, Authorization"
	next()
})

app.use(limiter)
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "static/")))

app.use("/api", admin_routes)

app.listen(PORT, () => {
	console.log(`
  
  ==================================

   L I S T E N  T O  P O R T ${PORT}

  ==================================
  
  `)
})
