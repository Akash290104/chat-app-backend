import expres from "express"
import protect from "../middleware/authMiddleware.js"
import { sendMessage, allMessages } from "../controllers/messageControllers.js"

const router = expres.Router()

router.route("/").post(protect, sendMessage)
router.route("/:chatId").get(protect, allMessages)

const messageRoutes = router
export default messageRoutes