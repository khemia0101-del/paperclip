import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workflowsRouter from "./workflows";
import threadsRouter from "./threads";
import messagesRouter from "./messages";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workflowsRouter);
router.use(threadsRouter);
router.use(messagesRouter);
router.use(dashboardRouter);
router.use(settingsRouter);

export default router;
