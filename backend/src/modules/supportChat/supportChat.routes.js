import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import supportChatController from "./supportChat.controller.js";

const router = express.Router();

router.get("/access", protect, supportChatController.getChatAccess);
router.get("/threads/:mode", protect, supportChatController.getThread);
router.post("/threads/:mode/messages", protect, supportChatController.sendUserMessage);

router.get("/admin/threads", protect, supportChatController.listAdminThreads);
router.get("/admin/threads/:id", protect, supportChatController.getAdminThread);
router.post("/admin/threads/:id/messages", protect, supportChatController.replyAsAdmin);

export default router;
