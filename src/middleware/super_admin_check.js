import { response, request } from "express"
import env from "dotenv"
import jwt from "jsonwebtoken"
import cryptoJs from "crypto-js"
env.config()

const super_admin_check = async (req = request, res = response, next) => {
	try {
		const bearer = await req.headers["authorization"]
		let token = await bearer.split(" ")[1]
		let unHashToken = await cryptoJs.AES.decrypt(token, process.env.API_SECRET).toString(cryptoJs.enc.Utf8)
		let verify = await jwt.verify(unHashToken, process.env.API_SECRET)

		if (verify.role !== "super_admin") {
			res.status(401).json({
				success: false,
				msg: "Only Super admin can do this task.",
			})
			return
		}

		next()
	} catch (error) {
		res.status(401).json({
			success: false,
			msg: "Only Super admin can do this task.",
			error: error.message,
		})
	}
}

export default super_admin_check
