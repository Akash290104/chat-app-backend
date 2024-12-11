
import express, { Router } from "express"
import {registerUser, login, allUsers} from '../controllers/userController.js'
import multer from "multer"
import {cloudinary, storage} from "../utility/cloudinary.js"
import protect from "../middleware/authMiddleware.js"

const upload = multer({storage})

const router = express.Router()

router.route("/").get(protect, allUsers)
router.route("/register").post(upload.single("pic") , registerUser)
router.post("/login", login)

const userRoutes = router

export default userRoutes
