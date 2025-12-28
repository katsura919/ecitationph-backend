import { Request, Response } from "express";
import Ordinance, { IOrdinance } from "../../../models/ordinance.model";
import Violation from "../../../models/violations.model";
import mongoose from "mongoose";

/**
 * Ordinance Controller
 * Handles CRUD operations for ordinances with versioning support
 */

/**
 * @route   POST /api/ordinances
 * @desc    Create a new ordinance with violations
 * @access  Admin only
 */
export const createOrdinance = async (req: Request, res: Response) => {
  try {
    const {
      ordinanceNo,
      title,
      description,
      dateIssued,
      dateApproved,
      legalReference,
      remarks,
      attachments,
      violations,
    } = req.body;

    // Create ordinance first
    const ordinance = new Ordinance({
      ordinanceNo,
      title,
      description,
      dateIssued,
      dateApproved,
      legalReference,
      remarks,
      attachments,
      violations: [],
      createdBy: req.user?.id,
      isActive: true,
    });

    await ordinance.save();

    // If violations are provided, create them and link to ordinance
    if (violations && Array.isArray(violations) && violations.length > 0) {
      const createdViolations: mongoose.Types.ObjectId[] = [];

      for (const violationData of violations) {
        const violation = new Violation({
          ...violationData,
          ordinanceId: ordinance._id,
          createdBy: req.user?.id,
          isActive: true,
        });

        await violation.save();
        createdViolations.push(violation._id as mongoose.Types.ObjectId);
      }

      // Update ordinance with violation references
      ordinance.violations = createdViolations;
      await ordinance.save();
    }

    // Populate violations before returning
    await ordinance.populate("violations");

    return res.status(201).json({
      success: true,
      message: "Ordinance created successfully",
      data: ordinance,
    });
  } catch (error: any) {
    console.error("Error creating ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/ordinances
 * @desc    Get all active ordinances
 * @access  Public or Authenticated
 */
export const getAllActiveOrdinances = async (req: Request, res: Response) => {
  try {
    const ordinances = await Ordinance.getAllActive();

    return res.status(200).json({
      success: true,
      count: ordinances.length,
      data: ordinances,
    });
  } catch (error: any) {
    console.error("Error fetching ordinances:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch ordinances",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/ordinances/:id
 * @desc    Get ordinance by ID
 * @access  Public or Authenticated
 */
export const getOrdinanceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ordinance ID",
      });
    }

    const ordinance = await Ordinance.findById(id)
      .populate("violations")
      .populate("createdBy", "firstname lastname email")
      .populate("approvedBy", "firstname lastname email");

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: ordinance,
    });
  } catch (error: any) {
    console.error("Error fetching ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/ordinances/no/:ordinanceNo
 * @desc    Get current active ordinance by ordinance number
 * @access  Public or Authenticated
 */
export const getOrdinanceByNo = async (req: Request, res: Response) => {
  try {
    const { ordinanceNo } = req.params;

    const ordinance = await Ordinance.getCurrentByOrdinanceNo(ordinanceNo);

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: ordinance,
    });
  } catch (error: any) {
    console.error("Error fetching ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/ordinances/history/:ordinanceGroupId
 * @desc    Get all versions of an ordinance
 * @access  Admin only
 */
export const getOrdinanceHistory = async (req: Request, res: Response) => {
  try {
    const { ordinanceGroupId } = req.params;

    const history = await Ordinance.getHistory(ordinanceGroupId);

    if (!history || history.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No ordinance history found",
      });
    }

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    console.error("Error fetching ordinance history:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch ordinance history",
      details: error.message,
    });
  }
};

/**
 * @route   PUT /api/ordinances/:id
 * @desc    Update ordinance (creates new version)
 * @access  Admin only
 */
export const updateOrdinance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ordinance ID",
      });
    }

    const ordinance = await Ordinance.findById(id);

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    if (!ordinance.isActive) {
      return res.status(400).json({
        success: false,
        error: "Cannot update an inactive or superseded ordinance",
      });
    }

    // Create new version
    const newVersion = await ordinance.createNewVersion(updates, req.user?.id);
    await newVersion.populate("violations");

    return res.status(200).json({
      success: true,
      message: "Ordinance updated successfully (new version created)",
      data: {
        oldVersion: ordinance,
        newVersion,
      },
    });
  } catch (error: any) {
    console.error("Error updating ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   DELETE /api/ordinances/:id
 * @desc    Soft delete ordinance (deactivate)
 * @access  Admin only
 */
export const deleteOrdinance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ordinance ID",
      });
    }

    const ordinance = await Ordinance.findById(id);

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    if (!ordinance.isActive) {
      return res.status(400).json({
        success: false,
        error: "Ordinance is already inactive",
      });
    }

    // Soft delete ordinance
    await ordinance.softDelete();

    // Also soft delete all associated violations
    await Violation.updateMany(
      { ordinanceId: ordinance._id },
      { isActive: false }
    );

    return res.status(200).json({
      success: true,
      message: "Ordinance and associated violations deactivated successfully",
      data: ordinance,
    });
  } catch (error: any) {
    console.error("Error deleting ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   POST /api/ordinances/search
 * @desc    Search ordinances with filters
 * @access  Public or Authenticated
 */
export const searchOrdinances = async (req: Request, res: Response) => {
  try {
    const {
      ordinanceNo,
      title,
      keyword,
      isActive = true,
      includeInactive = false,
    } = req.body;

    // Use keyword search if keyword is provided
    if (keyword) {
      const ordinances = await Ordinance.searchByKeyword(keyword);
      return res.status(200).json({
        success: true,
        count: ordinances.length,
        data: ordinances,
      });
    }

    // Build custom query
    const query: any = {};

    if (ordinanceNo) {
      query.ordinanceNo = { $regex: ordinanceNo, $options: "i" };
    }

    if (title) {
      query.title = { $regex: title, $options: "i" };
    }

    if (!includeInactive) {
      query.isActive = true;
    } else if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const ordinances = await Ordinance.find(query)
      .populate("violations")
      .populate("createdBy", "firstname lastname email")
      .sort({ dateIssued: -1, ordinanceNo: 1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: ordinances.length,
      data: ordinances,
    });
  } catch (error: any) {
    console.error("Error searching ordinances:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search ordinances",
      details: error.message,
    });
  }
};

/**
 * @route   POST /api/ordinances/:id/violations
 * @desc    Add violation to ordinance
 * @access  Admin only
 */
export const addViolationToOrdinance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const violationData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ordinance ID",
      });
    }

    const ordinance = await Ordinance.findById(id);

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    if (!ordinance.isActive) {
      return res.status(400).json({
        success: false,
        error: "Cannot add violation to inactive ordinance",
      });
    }

    // Create violation
    const violation = new Violation({
      ...violationData,
      ordinanceId: ordinance._id,
      createdBy: req.user?.id,
      isActive: true,
    });

    await violation.save();

    // Add to ordinance
    await ordinance.addViolation(violation._id as mongoose.Types.ObjectId);

    return res.status(201).json({
      success: true,
      message: "Violation added to ordinance successfully",
      data: violation,
    });
  } catch (error: any) {
    console.error("Error adding violation to ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to add violation to ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   DELETE /api/ordinances/:id/violations/:violationId
 * @desc    Remove violation from ordinance
 * @access  Admin only
 */
export const removeViolationFromOrdinance = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, violationId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(violationId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID",
      });
    }

    const ordinance = await Ordinance.findById(id);

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    if (!ordinance.isActive) {
      return res.status(400).json({
        success: false,
        error: "Cannot modify inactive ordinance",
      });
    }

    // Remove from ordinance
    await ordinance.removeViolation(new mongoose.Types.ObjectId(violationId));

    // Soft delete the violation
    await Violation.findByIdAndUpdate(violationId, { isActive: false });

    return res.status(200).json({
      success: true,
      message: "Violation removed from ordinance successfully",
    });
  } catch (error: any) {
    console.error("Error removing violation from ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to remove violation from ordinance",
      details: error.message,
    });
  }
};

/**
 * @route   PUT /api/ordinances/:id/approve
 * @desc    Approve an ordinance
 * @access  Admin only
 */
export const approveOrdinance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ordinance ID",
      });
    }

    const ordinance = await Ordinance.findById(id);

    if (!ordinance) {
      return res.status(404).json({
        success: false,
        error: "Ordinance not found",
      });
    }

    ordinance.dateApproved = new Date();
    ordinance.approvedBy = req.user?.id;
    await ordinance.save();

    return res.status(200).json({
      success: true,
      message: "Ordinance approved successfully",
      data: ordinance,
    });
  } catch (error: any) {
    console.error("Error approving ordinance:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to approve ordinance",
      details: error.message,
    });
  }
};
