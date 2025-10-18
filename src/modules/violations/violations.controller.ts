import { Request, Response } from 'express';
import Violation, { IViolation } from '../../models/violations.model';
import mongoose from 'mongoose';

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
    
    // Generate a unique violation group ID for new violations
    const violationGroupId = new mongoose.Types.ObjectId().toString();
    
    const violation = new Violation({
      ...violationData,
      violationGroupId,
      version: 1,
      effectiveFrom: violationData.effectiveFrom || new Date(),
      createdBy: req.user?.id,
      isActive: true
    });

    await violation.save();

    return res.status(201).json({
      success: true,
      message: 'Violation created successfully',
      data: violation
    });
  } catch (error: any) {
    console.error('Error creating violation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create violation',
      details: error.message
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
      data: violations
    });
  } catch (error: any) {
    console.error('Error fetching violations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch violations',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/violations/code/:code
 * @desc    Get current active violation by code
 * @access  Public or Authenticated
 */
export const getViolationByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const violation = await Violation.getCurrentByCode(code);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: violation
    });
  } catch (error: any) {
    console.error('Error fetching violation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch violation',
      details: error.message
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
        error: 'Invalid violation ID'
      });
    }

    const violation = await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: violation
    });
  } catch (error: any) {
    console.error('Error fetching violation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch violation',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/violations/history/:violationGroupId
 * @desc    Get all versions of a violation by violationGroupId
 * @access  Admin only
 */
export const getViolationHistory = async (req: Request, res: Response) => {
  try {
    const { violationGroupId } = req.params;

    const history = await Violation.getHistory(violationGroupId);

    if (!history || history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No violation history found'
      });
    }

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching violation history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch violation history',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/violations/:id
 * @desc    Update violation (creates new version)
 * @access  Admin only
 */
export const updateViolation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid violation ID'
      });
    }

    const violation = await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }

    if (!violation.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update an inactive or superseded violation'
      });
    }

    // Create new version
    const newVersion = await violation.createNewVersion(updates, req.user?.id);

    return res.status(200).json({
      success: true,
      message: 'Violation updated successfully (new version created)',
      data: {
        oldVersion: violation,
        newVersion
      }
    });
  } catch (error: any) {
    console.error('Error updating violation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update violation',
      details: error.message
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
        error: 'Invalid violation ID'
      });
    }

    const violation = await Violation.findById(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }

    if (!violation.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Violation is already inactive'
      });
    }

    // Soft delete
    await violation.softDelete();

    return res.status(200).json({
      success: true,
      message: 'Violation deactivated successfully',
      data: violation
    });
  } catch (error: any) {
    console.error('Error deleting violation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete violation',
      details: error.message
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
      fineStructure,
      isActive = true,
      includeInactive = false
    } = req.body;

    const query: any = {};

    // Build query
    if (code) {
      query.code = { $regex: code, $options: 'i' };
    }

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    if (fineStructure) {
      query.fineStructure = fineStructure;
    }

    if (!includeInactive) {
      query.isActive = true;
    } else if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const violations = await Violation.find(query)
      .sort({ code: 1, version: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: violations.length,
      data: violations
    });
  } catch (error: any) {
    console.error('Error searching violations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search violations',
      details: error.message
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
        error: 'Invalid request. Provide an array of violations.'
      });
    }

    const createdViolations = [];
    const errors = [];

    for (const violationData of violations) {
      try {
        const violationGroupId = new mongoose.Types.ObjectId().toString();
        
        const violation = new Violation({
          ...violationData,
          violationGroupId,
          version: 1,
          effectiveFrom: violationData.effectiveFrom || new Date(),
          createdBy: req.user?.id,
          isActive: true
        });

        await violation.save();
        createdViolations.push(violation);
      } catch (error: any) {
        errors.push({
          code: violationData.code,
          error: error.message
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
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error: any) {
    console.error('Error bulk creating violations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to bulk create violations',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/violations/calculate-fine
 * @desc    Calculate fine for a specific violation
 * @access  Public or Authenticated
 */
export const calculateFine = async (req: Request, res: Response) => {
  try {
    const { code, vehicleType, offenderType, offenseCount = 1 } = req.query;

    if (!code || !vehicleType || !offenderType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: code, vehicleType, offenderType'
      });
    }

    const violation = await Violation.getCurrentByCode(code as string);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: 'Violation not found'
      });
    }

    let fine = 0;
    const vType = vehicleType as 'PRIVATE' | 'FOR_HIRE';
    const oType = offenderType as 'driver' | 'mvOwner' | 'operator';

    if (violation.fineStructure === 'FIXED') {
      if (violation.fixedFine) {
        if (vType === 'PRIVATE') {
          fine = violation.fixedFine.private[oType === 'mvOwner' ? 'mvOwner' : 'driver'];
        } else if (vType === 'FOR_HIRE') {
          fine = violation.fixedFine.forHire[oType === 'operator' ? 'operator' : 'driver'];
        }
      }
    } else if (violation.fineStructure === 'PROGRESSIVE') {
      if (violation.progressiveFine) {
        const count = parseInt(offenseCount as string);
        let penalty;

        if (vType === 'PRIVATE') {
          penalty = violation.progressiveFine.private[oType === 'mvOwner' ? 'mvOwner' : 'driver'];
        } else if (vType === 'FOR_HIRE') {
          penalty = violation.progressiveFine.forHire[oType === 'operator' ? 'operator' : 'driver'];
        }

        if (penalty) {
          if (count === 1) fine = penalty.firstOffense;
          else if (count === 2) fine = penalty.secondOffense || penalty.firstOffense;
          else if (count === 3) fine = penalty.thirdOffense || penalty.secondOffense || penalty.firstOffense;
          else fine = penalty.subsequentOffense || penalty.thirdOffense || penalty.secondOffense || penalty.firstOffense;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        violation: {
          code: violation.code,
          title: violation.title,
          fineStructure: violation.fineStructure
        },
        calculation: {
          vehicleType: vType,
          offenderType: oType,
          offenseCount: parseInt(offenseCount as string),
          fine
        }
      }
    });
  } catch (error: any) {
    console.error('Error calculating fine:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate fine',
      details: error.message
    });
  }
};
