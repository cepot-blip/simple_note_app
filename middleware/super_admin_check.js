import { response, request } from "express"
import env from "dotenv"
env.config()

const super_admin_check = async (req = request, res = response, next) => {
	try {
		let { decode } = await req.body

		if (decode.role !== "superadmin") {
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
		})
	}
}

export default super_admin_check
