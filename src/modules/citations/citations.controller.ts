import { Request, Response } from 'express';
import Citation, { ICitation, CitationStatus } from '../../models/citation.model';
import Violation from '../../models/violations.model';
import Enforcer from '../../models/enforcer.model';
import Driver from '../../models/driver.model';
import mongoose from 'mongoose';
import * as CitationHelpers from './citations.helpers';

/**
 * Citations Controller
 * Handles CRUD operations for traffic citations/tickets
 */

/**
 * @route   POST /api/citations
 * @desc    Create a new citation (issue a ticket)
 * @access  Enforcer only
 */
export const createCitation = async (req: Request, res: Response) => {
  try {
    const {
      driverId,
      vehicleInfo,
      violationIds, 
      location,
      violationDateTime,
      images,
      notes,
      dueDate
    } = req.body;

    // Get enforcer ID from authenticated user OR from test header
    const enforcerId = req.user?.id || req.headers['x-enforcer-id'];
    
    if (!enforcerId) {
      return res.status(401).json({
        success: false,
        error: 'Enforcer ID is required (not authenticated and no test enforcer ID provided)'
      });
    }

    // Verify enforcer exists
    const enforcer = await Enforcer.findById(enforcerId);
    if (!enforcer) {
      return res.status(404).json({
        success: false,
        error: 'Enforcer not found'
      });
    }

    // Verify driver exists
    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: 'Driver ID is required'
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Validate and fetch violations
    if (!violationIds || !Array.isArray(violationIds) || violationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one violation must be specified'
      });
    }

    const violations = await Violation.find({
      _id: { $in: violationIds },
      isActive: true
    });

    if (violations.length !== violationIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more violations not found or inactive'
      });
    }

    // Build violation items with calculated fines
    const violationItems = violations.map((violation) => {
      // Calculate fine based on vehicle type and offender type
      let fineAmount = 0;
      
      if (violation.fineStructure === 'FIXED' && violation.fixedFine) {
        if (vehicleInfo.vehicleType === 'PRIVATE') {
          fineAmount = violation.fixedFine.private.driver;
        } else if (vehicleInfo.vehicleType === 'FOR_HIRE') {
          fineAmount = violation.fixedFine.forHire.driver;
        }
      } else if (violation.fineStructure === 'PROGRESSIVE' && violation.progressiveFine) {
        // For now, default to first offense
        // In a real system, you'd check driver's violation history
        if (vehicleInfo.vehicleType === 'PRIVATE') {
          fineAmount = violation.progressiveFine.private.driver.firstOffense;
        } else if (vehicleInfo.vehicleType === 'FOR_HIRE') {
          fineAmount = violation.progressiveFine.forHire.driver.firstOffense;
        }
      }

      return {
        violationId: violation._id,
        code: violation.code,
        title: violation.title,
        description: violation.description,
        fineAmount,
        offenseCount: 1 // Default to first offense
      };
    });

    // Calculate total amount
    const totalAmount = violationItems.reduce((sum, item) => sum + item.fineAmount, 0);

    // Generate citation number
    const citationNo = await Citation.generateCitationNo();

    // Calculate due date (default 15 days if not provided)
    const calculatedDueDate = dueDate 
      ? new Date(dueDate) 
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // Create citation
    const citation = new Citation({
      citationNo,
      driverId,
      vehicleInfo,
      violations: violationItems,
      totalAmount,
      amountPaid: 0,
      amountDue: totalAmount,
      issuedBy: enforcer._id,
      enforcerInfo: {
        badgeNo: enforcer.badgeNo,
        name: enforcer.name
      },
      location,
      violationDateTime: violationDateTime || new Date(),
      issuedAt: new Date(),
      status: CitationStatus.PENDING,
      dueDate: calculatedDueDate,
      images: images || [],
      notes: notes || '',
      isVoid: false
    });

    await citation.save();

    // Populate driver details before returning
    await citation.populate('driverId', 'firstName middleName lastName licenseNo contactNo email');

    return res.status(201).json({
      success: true,
      message: 'Citation created successfully',
      data: citation
    });
  } catch (error: any) {
    console.error('Error creating citation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create citation',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations
 * @desc    Get all citations with optional filters
 * @access  Admin/Enforcer
 */
export const getAllCitations = async (req: Request, res: Response) => {
  try {
    const {
      status,
      enforcerId,
      driverId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { isVoid: false };

    if (status) query.status = status;
    if (enforcerId) query.issuedBy = enforcerId;
    if (driverId) query.driverId = driverId;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const citations = await Citation.find(query)
      .populate('driverId', 'firstName lastName licenseNo')
      .populate('issuedBy', 'badgeNo name')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Citation.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: citations,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching citations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch citations',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations/:id
 * @desc    Get citation by ID
 * @access  Public/Authenticated
 */
export const getCitationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid citation ID'
      });
    }

    const citation = await Citation.findById(id)
      .populate('driverId', 'firstName lastName licenseNo contactNo')
      .populate('issuedBy', 'badgeNo name email contactNo')
      .populate('violations.violationId');

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: 'Citation not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: citation
    });
  } catch (error: any) {
    console.error('Error fetching citation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch citation',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations/number/:citationNo
 * @desc    Get citation by citation number
 * @access  Public
 */
export const getCitationByNumber = async (req: Request, res: Response) => {
  try {
    const { citationNo } = req.params;

    const citation = await Citation.findOne({ citationNo })
      .populate('driverId', 'firstName lastName licenseNo')
      .populate('issuedBy', 'badgeNo name')
      .populate('violations.violationId');

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: 'Citation not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: citation
    });
  } catch (error: any) {
    console.error('Error fetching citation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch citation',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/citations/search
 * @desc    Search citations with advanced filters
 * @access  Admin/Enforcer
 */
export const searchCitations = async (req: Request, res: Response) => {
  try {
    const filters = req.body;
    const citations = await CitationHelpers.searchCitations(Citation, filters);

    return res.status(200).json({
      success: true,
      count: citations.length,
      data: citations
    });
  } catch (error: any) {
    console.error('Error searching citations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search citations',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations/driver/:driverId
 * @desc    Get all citations for a specific driver
 * @access  Driver/Admin/Enforcer
 */
export const getCitationsByDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid driver ID'
      });
    }

    const citations = await Citation.getByDriver(new mongoose.Types.ObjectId(driverId));

    return res.status(200).json({
      success: true,
      count: citations.length,
      data: citations
    });
  } catch (error: any) {
    console.error('Error fetching driver citations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch driver citations',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations/enforcer/:enforcerId
 * @desc    Get all citations issued by a specific enforcer
 * @access  Enforcer/Admin
 */
export const getCitationsByEnforcer = async (req: Request, res: Response) => {
  try {
    const { enforcerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(enforcerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid enforcer ID'
      });
    }

    const citations = await Citation.getByEnforcer(new mongoose.Types.ObjectId(enforcerId));

    return res.status(200).json({
      success: true,
      count: citations.length,
      data: citations
    });
  } catch (error: any) {
    console.error('Error fetching enforcer citations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch enforcer citations',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations/overdue
 * @desc    Get all overdue citations
 * @access  Admin
 */
export const getOverdueCitations = async (req: Request, res: Response) => {
  try {
    const citations = await Citation.getOverdueCitations();

    return res.status(200).json({
      success: true,
      count: citations.length,
      data: citations
    });
  } catch (error: any) {
    console.error('Error fetching overdue citations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue citations',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/citations/:id/payment
 * @desc    Add payment to a citation (DISABLED - Payment history removed)
 * @access  Admin/Cashier
 */
// export const addPayment = async (req: Request, res: Response) => {
//   // Payment functionality disabled - payment history removed from model
//   return res.status(501).json({
//     success: false,
//     error: 'Payment functionality not implemented'
//   });
// };

/**
 * @route   PUT /api/citations/:id/contest
 * @desc    Contest a citation
 * @access  Driver
 */
export const contestCitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid citation ID'
      });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: 'Citation not found'
      });
    }

    if (citation.isVoid) {
      return res.status(400).json({
        success: false,
        error: 'Cannot contest a voided citation'
      });
    }

    if (citation.status === CitationStatus.CONTESTED) {
      return res.status(400).json({
        success: false,
        error: 'Citation is already contested'
      });
    }

    if (citation.status === CitationStatus.PAID) {
      return res.status(400).json({
        success: false,
        error: 'Cannot contest a paid citation'
      });
    }

    await citation.contestCitation(reason, req.user?.id);

    return res.status(200).json({
      success: true,
      message: 'Citation contested successfully',
      data: citation
    });
  } catch (error: any) {
    console.error('Error contesting citation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to contest citation',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/citations/:id/resolve-contest
 * @desc    Resolve a contested citation
 * @access  Admin
 */
export const resolveContest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, approve } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid citation ID'
      });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: 'Citation not found'
      });
    }

    if (citation.status !== CitationStatus.CONTESTED) {
      return res.status(400).json({
        success: false,
        error: 'Citation is not contested'
      });
    }

    await CitationHelpers.resolveContest(citation, resolution, req.user?.id, approve);

    return res.status(200).json({
      success: true,
      message: `Contest ${approve ? 'approved' : 'rejected'} successfully`,
      data: citation
    });
  } catch (error: any) {
    console.error('Error resolving contest:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve contest',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/citations/:id
 * @desc    Void a citation
 * @access  Admin
 */
export const voidCitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid citation ID'
      });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: 'Citation not found'
      });
    }

    if (citation.isVoid) {
      return res.status(400).json({
        success: false,
        error: 'Citation is already voided'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Void reason is required'
      });
    }

    await citation.voidCitation(reason, req.user?.id);

    return res.status(200).json({
      success: true,
      message: 'Citation voided successfully',
      data: citation
    });
  } catch (error: any) {
    console.error('Error voiding citation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to void citation',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/citations/statistics
 * @desc    Get citation statistics
 * @access  Admin
 */
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await Citation.getStatistics(start, end);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/citations/:id
 * @desc    Update citation details (limited fields)
 * @access  Admin
 */
export const updateCitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, images, dueDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid citation ID'
      });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: 'Citation not found'
      });
    }

    if (citation.isVoid) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a voided citation'
      });
    }

    // Update allowed fields
    if (notes !== undefined) citation.notes = notes;
    if (images !== undefined) citation.images = images;
    if (dueDate !== undefined) citation.dueDate = new Date(dueDate);

    await citation.save();

    return res.status(200).json({
      success: true,
      message: 'Citation updated successfully',
      data: citation
    });
  } catch (error: any) {
    console.error('Error updating citation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update citation',
      details: error.message
    });
  }
};
