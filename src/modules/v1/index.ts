import { Router } from "express";
import violationRoutes from "./violations/violations.routes";
import ordinanceRoutes from "./ordinance/ordinance.routes";
import authDriverRoutes from "./authentication/driver/driver.auth.routes";
import authEnforcerRoutes from "./authentication/enforcer/enforcer.auth.routes";
import authAdminRoutes from "./authentication/admin/admin.auth.routes";
import citationRoutes from "./citations/citations.routes";
import logsRoutes from "./citations/citations.logs/citations.logs.route";
import driverRoutes from "./driver/driver.routes";
import contestRoutes from "./contests/contest.routes";
import vehicleRoutes from "./vehicles/vehicles.routes";

const router = Router();

router.use("/violations", violationRoutes);
router.use("/ordinances", ordinanceRoutes);
router.use("/auth/driver", authDriverRoutes);
router.use("/auth/enforcer", authEnforcerRoutes);
router.use("/auth/admin", authAdminRoutes);
router.use("/citations", citationRoutes);
router.use("/logs", logsRoutes);
router.use("/drivers", driverRoutes);
router.use("/contests", contestRoutes);
router.use("/vehicles", vehicleRoutes);

export default router;
