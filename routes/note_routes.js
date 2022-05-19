import express from "express"
import jwt from "jsonwebtoken"
import env from "dotenv"
import path from "path"
import fs from "fs"
import conn from "../prisma/conn"
import content_upload from "../libs/upload_services"
import { authCheck } from "../middleware/auth"
import super_admin_check from "../middleware/super_admin_check"
env.config()

const note_routes = express.Router()

//      CREATE NOTE
note_routes.post("/note/create", content_upload.single("content"), authCheck, async (req, res) => {
	try {
		const data = await req.body
		const file = await req.file
		const store = await conn.note.create({
			data: {
				title: data.title,
				body: data.body,
				description: data.description,
				admin_id: parseInt(data.admin_id),
				contentUpload: {
					create: {
						filename: file.filename,
						location: `/public/uploads/content/${file.filename}`,
					},
				},
			},
		})

		res.status(201).json({
			success: true,
			query: store,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//      READ ALL NOTE
note_routes.post("/note/read", async (req, res) => {
	try {
		const { page = 1, limit = 10 } = await req.query
		const { filter } = await req.body
		const skip = (page - 1) * limit
		const result = await conn.note.findMany({
			skip: parseInt(skip),
			take: parseInt(limit),
			orderBy: {
				id: "desc",
			},
			where: filter,
			include: {
				contentUpload: {
					select: {
						id: true,
						filename: true,
						location: true,
					},
				},
			},
		})
		const cn = await conn.note.count({
			where: filter,
		})

		res.status(200).json({
			success: true,
			current_page: parseInt(page),
			total_page: Math.ceil(cn / limit),
			total_data: cn,
			query: result,
		})
	} catch (error) {
		res.status(500).json({
			success: true,
			error: error.message,
		})
	}
})

//      UPDATE NOTE
note_routes.put("/note/update", content_upload.single("content"), authCheck, async (req, res) => {
	try {
		const data = await req.body
		const file = await req.file
		const findNote = await conn.note.findUnique({
			where: {
				id: parseInt(data.id),
			},
			include: {
				contentUpload: {
					select: {
						id: true,
						filename: true,
						location: true,
					},
				},
			},
		})

		if (file) {
			const removeOldFile = await fs.unlinkSync(
				path.join(__dirname, `../static/public/uploads/content/${findNote.contentUpload.filename}`)
			)

			const updateNote = await conn.note.update({
				where: {
					id: parseInt(data.id),
				},
				data: {
					title: data.title,
					body: data.body,
					description: data.description,
					admin_id: data.admin_id,
					contentUpload: {
						filename: file.filename,
						location: `/public/uplodas/content/${file.filename}`,
					},
				},
			})
		} else {
			const updateNote = await conn.note.update({
				where: {
					id: parseInt(data.id),
				},
				data: {
					title: data.title,
					body: data.body,
					description: data.description,
					admin_id: data.admin_id,
				},
			})
		}

		res.status(201).json({
			success: true,
			msg: "Successfully update note",
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

//      DELETE NOTE
note_routes.delete("/note/delete", content_upload.single("content"), authCheck, async (req, res) => {
	try {
		const data = await req.body
		const file = await req.file
		const result = await conn.note.delete({
			where: {
				id: parseInt(data.id),
			},
		})

		if (!result) {
			res.status(401).json({
				success: false,
				msg: "Data not found",
			})
			return
		}

		//      DELETE NOTE FROM SERVER
		const deleteNoteFromServer = await fs.unlinkSync(
			path.join(__dirname, `../static/public/uploads/${result.filename}`)
		)

		res.status(201).json({
			success: true,
			msg: "Successfully delete note",
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

export default note_routes
