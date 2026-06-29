import { Router, type IRouter } from "express";
import healthRouter from "./health";
import statsRouter from "./stats";
import knowledgeRouter from "./knowledge";
import commandsRouter from "./commands";
import toolsRouter from "./tools";
import chatRouter from "./chat";
import analyzeRouter from "./analyze";
import usageRouter from "./usage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(knowledgeRouter);
router.use(commandsRouter);
router.use(toolsRouter);
router.use(chatRouter);
router.use(analyzeRouter);
router.use(usageRouter);

export default router;
