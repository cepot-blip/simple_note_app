import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import env from "dotenv"
import cryptoJs from "crypto-js"
import { rateLimit } from "express-rate-limit"
import super_admin_check from "../middleware/super_admin_check"
import { authCheck } from "../middleware/auth"
import ModelAdmin from "../model/ModelAdmin"
env.config()

const salt = bcrypt.genSaltSync(10)
const admin_controller = express.Router()

const limitLogin = rateLimit({
	windowMs: 15 * 60 * 1000, //15 minutes
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: "Pressing the screen too much, please wait a little longer up to 15 minutes !!",
})

//          CREATE ADMIN
admin_controller.post("/admin/create", async (req, res) => {
	try {
		const data = await req.body

		const createAdmin = await ModelAdmin.create({
			data: {
				email: data.email,
				role: data.role,
				password: bcrypt.hashSync(data.password, salt),
			},
		})

		res.status(201).json({
			success: true,
			query: "Successfully create Admin",
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//          ADMIN LOGIN
admin_controller.post("/admin/login", limitLogin, async (req, res) => {
	try {
		const { email, password } = await req.body
		const adminCheck = await ModelAdmin.findUnique({
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
				id: adminCheck.id,
				email: adminCheck.email,
				role: adminCheck.role,
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
admin_controller.get("/admin/read", authCheck, super_admin_check, async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query
		let skip = (page - 1) * limit
		const result = await ModelAdmin.findMany({
			take: parseInt(limit),
			skip: parseInt(skip),
			orderBy: { id: "desc" },
			include: {
				notes: {
					select: {
						id: true,
						title: true,
						body: true,
						description: true,
						contentUpload: {
							select: {
								id: true,
								filename: true,
								location: true,
							},
						},
					},
				},
			},
		})

		const cn = await ModelAdmin.count()

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
admin_controller.put("/admin/update", authCheck, super_admin_check, async (req, res) => {
	try {
		const data = await req.body
		const result = await ModelAdmin.update({
			where: {
				id: parseInt(data.id),
			},
			data: {
				email: data.email,
				password: data.password,
			},
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
admin_controller.delete("/admin/delete", authCheck, async (req, res) => {
	try {
		const { id } = await req.body
		const result = await ModelAdmin.delete({
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
admin_controller.post("/admin/find", async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query
		let skip = (page - 1) * limit
		const { filter } = await req.body
		const result = await ModelAdmin.findFirst({
			where: filter,
			take: parseInt(page),
			skip: parseInt(skip),
			orderBy: { id: "desc" },
			include: {
				notes: {
					select: {
						id: true,
						title: true,
						body: true,
						description: true,
						contentUpload: {
							select: {
								id: true,
								filename: true,
								location: true,
							},
						},
					},
				},
			},
		})

		const cn = await ModelAdmin.count()

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

admin_controller.put("/admin/changed_password", async (req, res) => {
	try {
		const { old_password, new_password, email } = await req.body
		const findUser = await ModelAdmin.findUnique({
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
		const updatePassword = await ModelAdmin.update({
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
admin_controller.post("/admin/validate", async (req, res) => {
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

export default admin_controller
