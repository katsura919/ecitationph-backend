import express from 'express';
import * as driverController from './driver.controllers';

const router = express.Router();


router.get('/', driverController.getDrivers);

export default router;
