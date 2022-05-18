import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import env from "dotenv"
import moment from "moment"
import cryptoJs from "crypto-js"
import { rateLimit } from "express-rate-limit"
import { authCheck } from "../middleware/auth"
import conn from "../prisma/conn"
env.config()

const salt = bcrypt.genSaltSync(10)
const admin_routes = express.Router()

const limitLogin = rateLimit({
	windowMs: 15 * 1000, //15 minute
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: "Too much pressing the screen please wait a while longer !!",
})

//          CREATE ADMIN
admin_routes.post("/admin_create", async (req, res) => {
	try {
		//      EMAIL CHECK
		const { email, password, role } = await req.body

		//check prev email
		const checkEmail = await conn.admin.findUnique({ where: { email: email } })

		if (checkEmail) {
			return res.status(401).json({
				success: false,
				msg: "Email already used",
			})
			return
		}

		//      ADD ADMIN DATA
		const result = await conn.admin.create({
			data: {
				email: email,
				password: bcrypt.hashSync(password, salt),
				role,
			},
		})

		if (!result) {
			res.status(401).json({
				success: false,
				msg: "Email already used",
			})
			return
		}

		//		VERIF EMAIL
		const verifEmail = await wellcomeMail(email)

		res.status(201).json({
			success: true,
			msg: "Successfully Create Admin",
			role: role,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//          ADMIN LOGIN
admin_routes.post("/admin_login", limitLogin, async (req, res) => {
	try {
		const { email, password } = await req.body
		const adminCheck = await conn.admin.findUnique({
			where: {
				email: email,
			},
		})

		if (!adminCheck) {
			res.status(404).json({
				success: false,
				msg: "Email not found",
			})
			return
		}

		const comparePassword = await bcrypt.compareSync(password, adminCheck.password)

		if (!comparePassword) {
			res.status(401).json({
				success: false,
				msg: "The password you entered is wrong",
			})
			return
		}

		const token = await jwt.sign(
			{
				app_name: "simple_note_app",
				admin_id: adminCheck.id,
				admin_email: adminCheck.email,
				admin_role: adminCheck.role,
				req_time: moment().format("dddd DD/MM/YYYY hh:mm:ss"),
			},
			process.env.API_SECRET,
			{
				expiresIn: "1d",
			}
		)

		const hashToken = await cryptoJs.AES.encrypt(token, process.env.API_SECRET).toString()

		res.setHeader("Access-Control-Allow-Origin", "*")
		res.status(200).json({
			success: true,
			token: hashToken,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//      READ ALL ADMIN
admin_routes.get("/admin_read", authCheck, async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query
		let skip = (page - 1) * limit
		const result = await conn.admin.findMany({
			take: parseInt(limit),
			skip: parseInt(skip),
			orderBy: { id: "desc" },
		})

		const cn = await conn.admin.count()

		res.status(200).json({
			current_page: parseInt(page),
			total_page: Math.ceil(cn / limit),
			total_data: cn,
			success: true,
			query: result,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//      UPDATE ADMIN
admin_routes.put("/admin_update/:id", authCheck, async (req, res) => {
	try {
		const data = await req.body
		const result = await conn.admin.update({
			where: {
				id: parseInt(req.params.id),
			},
			data: data,
		})

		res.status(201).json({
			success: true,
			msg: "Successfully updated data",
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//    DELETE ADMIN
admin_routes.delete("/admin_delete", authCheck, async (req, res) => {
	try {
		const { id } = await req.body
		const result = await conn.admin.delete({
			where: {
				id: parseInt(id),
			},
		})

		res.status(201).json({
			success: true,
			msg: "Successfully deleted data",
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//      FIND ADMIN
admin_routes.post("/admin_find", authCheck, async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query
		let skip = (page - 1) * limit
		const { filter } = await req.body
		const result = await conn.admin.findFirst({
			where: filter,
			take: parseInt(page),
			skip: parseInt(skip),
			orderBy: { id: "desc" },
		})

		const cn = await conn.admin.count()

		res.status(200).json({
			current_page: parseInt(page),
			total_page: Math.ceil(cn / limit),
			total_data: cn,
			success: true,
			query: result,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

admin_routes.put("/admin_changed_password", authCheck, async (req, res) => {
	try {
		const { old_password, new_password, email } = await req.body
		const findUser = await conn.admin.findUnique({
			where: {
				email: email,
			},
		})

		if (!findUser) {
			res.status(404).json({
				success: false,
				msg: "Email not found",
			})
			return
		}

		const compareOldPassword = await bcrypt.compareSync(old_password, findUser.password)
		if (!compareOldPassword) {
			res.status(401).json({
				success: false,
				msg: "Wrong old password",
			})
			return
		}

		const hashNewPassword = await bcrypt.hashSync(new_password, salt)
		const updatePassword = await conn.admin.update({
			where: {
				email: email,
			},
			data: {
				password: hashNewPassword,
			},
		})

		res.status(201).json({
			success: true,
			msg: "Successfully changed password",
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//		ADMIN VALIDATE
admin_routes.post("/admin_validate", authCheck, async (req, res) => {
	try {
		const { token } = await req.body
		const decryptToken = await cryptoJs.AES.decrypt(token, process.env.API_SECRET).toString(cryptoJs.enc.Utf8)
		const verify = await jwt.verify(decryptToken, process.env.API_SECRET)

		if (!verify) {
			res.status(401).json({
				success: false,
				msg: "Admin has expired, please login again.",
			})
			return
		}

		res.status(201).json({
			success: true,
			msg: "Authorization Admin",
			query: jwt.decode(decryptToken),
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

export default admin_routes
