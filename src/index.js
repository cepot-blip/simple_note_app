import express from "express"
import cors from "cors"
import path from "path"
import env from "dotenv"
env.config()
const app = express()
const PORT = process.env.PORT
import { rateLimit } from "express-rate-limit"
import helmet from "helmet"
import admin_controller from "./controller/admin_controller"
import note_controller from "./controller/note_controller"

//	RATE LIMIT, THE PROCESS OF LIMITING THE NUMBER OF USER/CLIENT REQUSET ON CERTAIN RESOURCES
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, //15 minutes
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: "Too much pressing the screen please wait a while longer !!",
})

//		MIDDLEWARE
app.use((req, res, next) => {
	// WEBSITE YOU WISH TO ALLOW TO CONNECT
	req.headers["Access-control-allow-origin"] = "*"

	// REQUEST METHOD YOU WISH TO ALLOW
	req.headers["Access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"

	// REQUEST HEADERS YOU WISH TO ALLOW
	req.headers["Access-control-allow-headers"] = "Content-Type, Authorization"

	// PASS TO NEXT LAYER OF MIDDLEWARE
	next()
})

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
app.use(limiter)
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "static/")))

//		ROUTES
app.use("/api", admin_controller)
app.use("/api", note_controller)

//		LISTENER
app.listen(PORT, () => {
	console.log(`
  
  ==================================

   L I S T E N  T O  P O R T ${PORT}

  ==================================
  
  `)
})
