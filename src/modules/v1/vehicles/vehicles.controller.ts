import { Request, Response } from "express";
import Vehicle, {
  IVehicle,
  VehicleStatus,
  VehicleType,
} from "../../../models/vehicle.model";
import VehicleOwner, {
  VehicleOwnerStatus,
} from "../../../models/vehicle.owner.model";
import Driver from "../../../models/driver.model";
import mongoose from "mongoose";

/**
 * @route   POST /api/v1/vehicles
 * @desc    Create a new vehicle with owner
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
      registeredOwner,
      registrationDate,
      expirationDate,
      notes,
      owner,
    } = req.body;

    // Validate required fields
    if (!plateNo) {
      return res.status(400).json({
        success: false,
        error: "Plate number is required",
      });
    }

    // Check if vehicle with this plate number already exists
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

    // If owner information is provided, create or find the owner
    let ownerId: mongoose.Types.ObjectId;

    if (owner) {
      // Create new vehicle owner
      const vehicleOwner = new VehicleOwner({
        firstName: owner.firstName,
        middleName: owner.middleName,
        lastName: owner.lastName,
        status: VehicleOwnerStatus.ACTIVE,
      });

      await vehicleOwner.save();

      ownerId = vehicleOwner._id as mongoose.Types.ObjectId;
    } else {
      return res.status(400).json({
        success: false,
        error: "Owner information is required",
      });
    }

    // Create the vehicle
    const vehicle = new Vehicle({
      plateNo: plateNo.toUpperCase(),
      vehicleType: vehicleType || VehicleType.PRIVATE,
      classification,
      make,
      vehicleModel,
      year,
      color,
      bodyMark,
      registeredOwner,
      ownerId,
      registrationDate,
      expirationDate,
      status: VehicleStatus.ACTIVE,
      notes,
    });

    await vehicle.save();

    // Populate owner details before returning
    await vehicle.populate("ownerId", "firstName middleName lastName");

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
    const {
      plateNo,
      search,
      vehicleType,
      status,
      ownerId,
      page = 1,
      limit = 20,
    } = req.query;

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
      ];
    }

    // Filter by vehicle type
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    // Filter by status
    if (status) {
      query.status = status;
    } else {
      // Default to active vehicles only
      query.status = VehicleStatus.ACTIVE;
    }

    // Filter by owner
    if (ownerId) {
      query.ownerId = ownerId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const vehicles = await Vehicle.find(query)
      .populate("ownerId", "firstName middleName lastName")
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

    const vehicle = await Vehicle.findById(id).populate(
      "ownerId",
      "firstName middleName lastName"
    );

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
    }).populate("ownerId", "firstName middleName lastName");

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
      registeredOwner,
      registrationDate,
      expirationDate,
      status,
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
    if (registeredOwner !== undefined)
      vehicle.registeredOwner = registeredOwner;
    if (registrationDate !== undefined)
      vehicle.registrationDate = registrationDate;
    if (expirationDate !== undefined) vehicle.expirationDate = expirationDate;
    if (status !== undefined) vehicle.status = status;
    if (notes !== undefined) vehicle.notes = notes;

    await vehicle.save();

    await vehicle.populate("ownerId", "firstName middleName lastName");

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
 * @desc    Delete vehicle (soft delete by setting status to INACTIVE)
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

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Soft delete
    vehicle.status = VehicleStatus.INACTIVE;
    await vehicle.save();

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

    // If driver doesn't have a vehicle owner ID, return empty array
    if (!driver.vehicleOwnerId) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Driver does not own any vehicles",
      });
    }

    // Find all vehicles owned by this driver's vehicle owner
    const vehicles = await Vehicle.find({
      ownerId: driver.vehicleOwnerId,
      status: VehicleStatus.ACTIVE,
    }).populate("ownerId", "firstName middleName lastName");

    return res.status(200).json({
      success: true,
      data: vehicles,
      count: vehicles.length,
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
