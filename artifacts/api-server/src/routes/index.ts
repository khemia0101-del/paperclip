import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workflowsRouter from "./workflows";
import threadsRouter from "./threads";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import webhookRouter from "./webhook";
import commandCenterRouter from "./command-center";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workflowsRouter);
router.use(threadsRouter);
router.use(messagesRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(webhookRouter);
router.use(commandCenterRouter);

export default router;
