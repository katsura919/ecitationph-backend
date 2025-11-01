import { Router } from "express";
import v1 from "../modules/v1/index"

const router = Router();

// Mount routes
router.use("/v1", v1);

export default router;
