import express, { response, request } from "express"
import cryptoJs from "crypto-js"
import jwt from "jsonwebtoken"
import env from "dotenv"
env.config()

export const authCheck = async (req = request, res = response, next) => {
	try {
		const token = await req.headers["authorization"]

		if (!token) {
			res.status(401).json({
				success: false,
				msg: "Login first ?",
			})
			return
		}

		const decToken = await cryptoJs.AES.decrypt(token.split(" ")[1], process.env.API_SECRET).toString(cryptoJs.enc.Utf8)

		const verify = await jwt.verify(decToken, process.env.API_SECRET)

		if (!verify) {
			res.status(401).json({
				success: false,
				msg: "Login first ?",
			})
			return
		}

		if (verify.exp < Date.now() / 1000) {
			res.status(401).json({
				success: false,
				msg: "Token Expirited",
			})
			return
		}

		next()
	} catch (error) {
		res.status(401).json({
			success: false,
			msg: "Login first ?",
		})
	}
}
