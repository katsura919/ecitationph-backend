import express from "express";
import * as vehicleController from "./vehicles.controller";

const router = express.Router();

/**
 * @route   POST /api/v1/vehicles
 * @desc    Create a new vehicle with owner
 * @access  Public (for testing) / Private (in production)
 */
router.post("/", vehicleController.createVehicle);

/**
 * @route   GET /api/v1/vehicles/search
 * @desc    Search for vehicles
 * @access  Public
 */
router.get("/search", vehicleController.searchVehicles);

/**
 * @route   GET /api/v1/vehicles/driver/:driverId
 * @desc    Get all vehicles owned by a driver
 * @access  Public
 */
router.get("/driver/:driverId", vehicleController.getVehiclesByDriver);

/**
 * @route   GET /api/v1/vehicles/plate/:plateNo
 * @desc    Get vehicle by plate number
 * @access  Public
 */
router.get("/plate/:plateNo", vehicleController.getVehicleByPlateNo);

/**
 * @route   GET /api/v1/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Public
 */
router.get("/:id", vehicleController.getVehicleById);

/**
 * @route   PUT /api/v1/vehicles/:id
 * @desc    Update vehicle
 * @access  Private
 */
router.put("/:id", vehicleController.updateVehicle);

/**
 * @route   DELETE /api/v1/vehicles/:id
 * @desc    Delete vehicle (soft delete)
 * @access  Private
 */
router.delete("/:id", vehicleController.deleteVehicle);

export default router;
