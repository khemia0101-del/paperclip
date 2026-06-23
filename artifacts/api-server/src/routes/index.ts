import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workflowsRouter from "./workflows";
import threadsRouter from "./threads";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import webhookRouter from "./webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workflowsRouter);
router.use(threadsRouter);
router.use(messagesRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(webhookRouter);

export default router;
