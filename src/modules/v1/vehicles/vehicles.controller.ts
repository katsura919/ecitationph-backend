import { Request, Response } from "express";
import Vehicle, { IVehicle, VehicleType } from "../../../models/vehicle.model";
import Driver from "../../../models/driver.model";
import mongoose from "mongoose";

/**
 * @route   POST /api/v1/vehicles
 * @desc    Create a new vehicle with owner information
 * @access  Public (for testing) / Private (in production)
 */
export const createVehicle = async (req: Request, res: Response) => {
  try {
    const {
      plateNo,
      vehicleType,
      classification,
      make,
      vehicleModel,
      year,
      color,
      bodyMark,
      registrationDate,
      expirationDate,
      notes,
      ownerFirstName,
      ownerMiddleName,
      ownerLastName,
    } = req.body;

    // Check if vehicle with this plate number already exists (only if plateNo provided)
    if (plateNo) {
      const existingVehicle = await Vehicle.findOne({
        plateNo: plateNo.toUpperCase(),
      });

      if (existingVehicle) {
        return res.status(409).json({
          success: false,
          error: "Vehicle with this plate number already exists",
          data: existingVehicle,
        });
      }
    }

    // Create the vehicle with owner information
    const vehicle = new Vehicle({
      plateNo: plateNo ? plateNo.toUpperCase() : undefined,
      vehicleType: vehicleType || VehicleType.PRIVATE,
      classification,
      make,
      vehicleModel,
      year,
      color,
      bodyMark,
      ownerFirstName,
      ownerMiddleName,
      ownerLastName,
      registrationDate,
      expirationDate,
      notes,
    });

    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error: any) {
    console.error("Error creating vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create vehicle",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/v1/vehicles/search
 * @desc    Search for vehicle by plate number or other criteria
 * @access  Public
 */
export const searchVehicles = async (req: Request, res: Response) => {
  try {
    const { plateNo, search, vehicleType, page = 1, limit = 20 } = req.query;

    const query: any = {};

    // Search by plate number (exact match)
    if (plateNo) {
      query.plateNo = (plateNo as string).toUpperCase();
    }

    // General search (partial match)
    if (search && !plateNo) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { plateNo: searchRegex },
        { make: searchRegex },
        { vehicleModel: searchRegex },
        { ownerFirstName: searchRegex },
        { ownerLastName: searchRegex },
      ];
    }

    // Filter by vehicle type
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const vehicles = await Vehicle.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Vehicle.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: vehicles,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error searching vehicles:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search vehicles",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/v1/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Public
 */
export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error: any) {
    console.error("Error fetching vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch vehicle",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/v1/vehicles/plate/:plateNo
 * @desc    Get vehicle by plate number
 * @access  Public
 */
export const getVehicleByPlateNo = async (req: Request, res: Response) => {
  try {
    const { plateNo } = req.params;

    const vehicle = await Vehicle.findOne({
      plateNo: plateNo.toUpperCase(),
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
        plateNo: plateNo.toUpperCase(),
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error: any) {
    console.error("Error fetching vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch vehicle",
      details: error.message,
    });
  }
};

/**
 * @route   PUT /api/v1/vehicles/:id
 * @desc    Update vehicle
 * @access  Private
 */
export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      vehicleType,
      classification,
      make,
      vehicleModel,
      year,
      color,
      bodyMark,
      engineNo,
      chassisNo,
      registrationDate,
      expirationDate,
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Update allowed fields
    if (vehicleType !== undefined) vehicle.vehicleType = vehicleType;
    if (classification !== undefined) vehicle.classification = classification;
    if (make !== undefined) vehicle.make = make;
    if (vehicleModel !== undefined) vehicle.vehicleModel = vehicleModel;
    if (year !== undefined) vehicle.year = year;
    if (color !== undefined) vehicle.color = color;
    if (bodyMark !== undefined) vehicle.bodyMark = bodyMark;
    if (registrationDate !== undefined)
      vehicle.registrationDate = registrationDate;
    if (expirationDate !== undefined) vehicle.expirationDate = expirationDate;
    if (notes !== undefined) vehicle.notes = notes;

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error: any) {
    console.error("Error updating vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update vehicle",
      details: error.message,
    });
  }
};

/**
 * @route   DELETE /api/v1/vehicles/:id
 * @desc    Delete vehicle
 * @access  Private
 */
export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid vehicle ID",
      });
    }

    const vehicle = await Vehicle.findByIdAndDelete(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting vehicle:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete vehicle",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/v1/vehicles/driver/:driverId
 * @desc    Get all vehicles owned by a driver
 * @access  Public
 */
export const getVehiclesByDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid driver ID",
      });
    }

    // Find the driver
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: "Driver not found",
      });
    }

    // Note: Vehicle ownership is now tracked directly in Vehicle model with owner name fields
    // This endpoint returns empty array since we no longer have VehicleOwner table
    // In the future, this could be enhanced to match vehicles by driver's name
    return res.status(200).json({
      success: true,
      data: [],
      message:
        "Vehicle ownership tracking has been simplified. Use vehicle search instead.",
    });
  } catch (error: any) {
    console.error("Error fetching driver vehicles:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch driver vehicles",
      details: error.message,
    });
  }
};
