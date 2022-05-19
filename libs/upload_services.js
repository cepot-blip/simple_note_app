import multer from "multer"
import path from "path"

// content storage
const content_storage = multer.diskStorage({
	filename: (req, files, cb) => {
		cb(null, Date.now() + "_" + files.originalname)
	},
	destination: (req, files, cb) => {
		cb(null, path.join(__dirname, `../static/public/uploads/content`))
	},
})

const content_upload = multer({
	storage: content_storage,
	limits: {
		fileSize: 50000000,
	},
})

export default content_upload
