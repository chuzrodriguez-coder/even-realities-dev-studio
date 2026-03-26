import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bleRouter from "./ble";
import displayRouter from "./display";
import featuresRouter from "./features";
import breakTimerRouter from "./break-timer";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ble", bleRouter);
router.use("/display", displayRouter);
router.use("/features", featuresRouter);
router.use("/break-timer", breakTimerRouter);

export default router;
