import { Request, Response } from "express";
import Violation, { IViolation } from "../../../models/violations.model";
import mongoose from "mongoose";

/**
 * Violations Controller
 * Handles CRUD operations for traffic violations with versioning support
 */

/**
 * @route   POST /api/violations
 * @desc    Create a new violation
 * @access  Admin only (should be protected by admin middleware)
 */
export const createViolation = async (req: Request, res: Response) => {
  try {
    const violationData = req.body;

    // Validate ordinanceId is provided
    if (!violationData.ordinanceId) {
      return res.status(400).json({
        success: false,
        error: "ordinanceId is required",
      });
    }

    // Validate penalties array
    if (
      !violationData.penalties ||
      !Array.isArray(violationData.penalties) ||
      violationData.penalties.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "At least one penalty must be provided",
      });
    }

    const violation = new Violation({
      ...violationData,
      createdBy: req.user?.id,
      isActive: true,
    });

    await violation.save();

    return res.status(201).json({
      success: true,
      message: "Violation created successfully",
      data: violation,
    });
  } catch (error: any) {
    console.error("Error creating violation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create violation",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/violations
 * @desc    Get all active violations
 * @access  Public or Authenticated
 */
export const getAllActiveViolations = async (req: Request, res: Response) => {
  try {
    const violations = await Violation.getAllActive();

    return res.status(200).json({
      success: true,
      count: violations.length,
      data: violations,
    });
  } catch (error: any) {
    console.error("Error fetching violations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch violations",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/violations/code/:code
 * @desc    Get active violation by code
 * @access  Public or Authenticated
 */
export const getViolationByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const violation = await Violation.getByCode(code);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: "Violation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: violation,
    });
  } catch (error: any) {
    console.error("Error fetching violation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch violation",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/violations/:id
 * @desc    Get violation by ID (any version)
 * @access  Public or Authenticated
 */
export const getViolationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid violation ID",
      });
    }

    const violation = await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: "Violation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: violation,
    });
  } catch (error: any) {
    console.error("Error fetching violation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch violation",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/violations/ordinance/:ordinanceId
 * @desc    Get all violations by ordinance
 * @access  Public or Authenticated
 */
export const getViolationsByOrdinance = async (req: Request, res: Response) => {
  try {
    const { ordinanceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ordinanceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ordinance ID",
      });
    }

    const violations = await Violation.getByOrdinance(
      new mongoose.Types.ObjectId(ordinanceId)
    );

    return res.status(200).json({
      success: true,
      count: violations.length,
      data: violations,
    });
  } catch (error: any) {
    console.error("Error fetching violations by ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch violations",
      details: error.message,
    });
  }
};

/**
 * @route   DELETE /api/violations/:id
 * @desc    Soft delete violation (deactivate)
 * @access  Admin only
 */
export const deleteViolation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid violation ID",
      });
    }

    const violation = await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: "Violation not found",
      });
    }

    if (!violation.isActive) {
      return res.status(400).json({
        success: false,
        error: "Violation is already inactive",
      });
    }

    // Soft delete
    await violation.softDelete();

    return res.status(200).json({
      success: true,
      message: "Violation deactivated successfully",
      data: violation,
    });
  } catch (error: any) {
    console.error("Error deleting violation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete violation",
      details: error.message,
    });
  }
};

/**
 * @route   POST /api/violations/search
 * @desc    Search violations with filters
 * @access  Public or Authenticated
 */
export const searchViolations = async (req: Request, res: Response) => {
  try {
    const {
      code,
      title,
      ordinanceId,
      isActive = true,
      includeInactive = false,
    } = req.body;

    const query: any = {};

    // Build query
    if (code) {
      query.code = { $regex: code, $options: "i" };
    }

    if (title) {
      query.title = { $regex: title, $options: "i" };
    }

    if (ordinanceId) {
      query.ordinanceId = ordinanceId;
    }

    if (!includeInactive) {
      query.isActive = true;
    } else if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const violations = await Violation.find(query)
      .populate("ordinanceId")
      .sort({ code: 1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: violations.length,
      data: violations,
    });
  } catch (error: any) {
    console.error("Error searching violations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search violations",
      details: error.message,
    });
  }
};

/**
 * @route   POST /api/violations/bulk
 * @desc    Bulk create violations (for seeding)
 * @access  Admin only
 */
export const bulkCreateViolations = async (req: Request, res: Response) => {
  try {
    const { violations } = req.body;

    if (!Array.isArray(violations) || violations.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid request. Provide an array of violations.",
      });
    }

    const createdViolations = [];
    const errors = [];

    for (const violationData of violations) {
      try {
        // Validate required fields
        if (!violationData.ordinanceId) {
          throw new Error("ordinanceId is required");
        }
        if (!violationData.penalties || violationData.penalties.length === 0) {
          throw new Error("At least one penalty is required");
        }

        const violation = new Violation({
          ...violationData,
          createdBy: req.user?.id,
          isActive: true,
        });

        await violation.save();
        createdViolations.push(violation);
      } catch (error: any) {
        errors.push({
          code: violationData.code,
          error: error.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdViolations.length} violations`,
      data: {
        created: createdViolations.length,
        failed: errors.length,
        violations: createdViolations,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error bulk creating violations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to bulk create violations",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/violations/:id/penalties
 * @desc    Get penalties for a specific violation
 * @access  Public or Authenticated
 */
export const getViolationPenalties = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid violation ID",
      });
    }

    const violation = await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: "Violation not found",
      });
    }

    if (!violation.isActive) {
      return res.status(400).json({
        success: false,
        error: "Violation is inactive",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        violation: {
          id: violation._id,
          code: violation.code,
          title: violation.title,
          description: violation.description,
        },
        penalties: violation.penalties,
      },
    });
  } catch (error: any) {
    console.error("Error fetching violation penalties:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch violation penalties",
      details: error.message,
    });
  }
};
