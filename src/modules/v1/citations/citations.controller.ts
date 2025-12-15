import { Request, Response } from "express";
import Citation, {
  ICitation,
  CitationStatus,
} from "../../../models/citation.model";
import Violation from "../../../models/violations.model";
import Enforcer from "../../../models/enforcer.model";
import Driver from "../../../models/driver.model";
import Vehicle from "../../../models/vehicle.model";
import mongoose from "mongoose";
import * as CitationHelpers from "./citations.helpers";

export const createCitation = async (req: Request, res: Response) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[Citation Create] Request ID: ${requestId} - Started`);

  try {
    const {
      driverId,
      vehicleId,
      violationIds,
      location,
      violationDateTime,
      images,
      notes,
      dueDate,
    } = req.body;

    // Get enforcer ID from authenticated user OR from test header
    const enforcerId = req.user?.id || req.headers["x-enforcer-id"];

    if (!enforcerId) {
      console.log(
        `[Citation Create] Request ID: ${requestId} - No enforcer ID`
      );
      return res.status(401).json({
        success: false,
        error:
          "Enforcer ID is required (not authenticated and no test enforcer ID provided)",
      });
    }

    // Verify enforcer exists
    const enforcer = await Enforcer.findById(enforcerId);
    if (!enforcer) {
      return res.status(404).json({
        success: false,
        error: "Enforcer not found",
      });
    }

    // Verify driver exists
    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: "Driver ID is required",
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: "Driver not found",
      });
    }

    // Verify vehicle exists
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: "Vehicle ID is required",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Validate and fetch violations
    if (
      !violationIds ||
      !Array.isArray(violationIds) ||
      violationIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "At least one violation must be specified",
      });
    }

    const violations = await Violation.find({
      _id: { $in: violationIds },
      isActive: true,
    });

    if (violations.length !== violationIds.length) {
      return res.status(400).json({
        success: false,
        error: "One or more violations not found or inactive",
      });
    }

    // Build violation items with calculated fines
    // Now with automatic offense counting for progressive fines
    const violationItems = await Promise.all(
      violations.map(async (violation) => {
        let fineAmount = 0;
        let offenseCount = 1;

        console.log(
          `[Violation Processing] ${violation.code} - Structure: ${violation.fineStructure}`
        );

        if (violation.fineStructure === "FIXED" && violation.fixedFine) {
          // Fixed fines - same amount regardless of offense count
          console.log(`[Fixed Fine] Processing ${violation.code} as FIXED`);
          if (vehicle.vehicleType === "PRIVATE") {
            fineAmount = violation.fixedFine.private.driver;
          } else if (vehicle.vehicleType === "FOR_HIRE") {
            fineAmount = violation.fixedFine.forHire.driver;
          }
          console.log(
            `[Fixed Fine] Amount for ${violation.code}: ₱${fineAmount}`
          );
        } else if (
          violation.fineStructure === "PROGRESSIVE" &&
          violation.progressiveFine
        ) {
          // Progressive fines - check driver's violation history
          // Query previous citations for this driver with the same violation
          const previousCitations = await Citation.find({
            driverId: driverId,
            "violations.violationId": violation._id,
            status: {
              $in: [
                CitationStatus.PAID,
                CitationStatus.PENDING,
                CitationStatus.OVERDUE,
                CitationStatus.PARTIALLY_PAID,
              ],
            },
            isVoid: false,
          }).select("violations");

          console.log(
            `[Progressive Fine] Checking history for violation ${violation.code} (${violation._id})`
          );
          console.log(
            `[Progressive Fine] Found ${previousCitations.length} previous citations`
          );

          // Count total occurrences of this specific violation
          const violationIdStr = (
            violation._id as mongoose.Types.ObjectId
          ).toString();
          offenseCount =
            previousCitations.reduce((count, citation) => {
              const violationCount = citation.violations.filter(
                (v: any) =>
                  v.violationId && v.violationId.toString() === violationIdStr
              ).length;
              return count + violationCount;
            }, 0) + 1; // +1 for current offense

          console.log(
            `[Progressive Fine] Offense count for ${violation.code}: ${offenseCount}`
          );

          // Get appropriate fine schedule based on vehicle type
          const fineSchedule =
            vehicle.vehicleType === "PRIVATE"
              ? violation.progressiveFine.private.driver
              : violation.progressiveFine.forHire.driver;

          // Determine fine based on offense count
          if (offenseCount === 1) {
            fineAmount = fineSchedule.firstOffense;
          } else if (offenseCount === 2 && fineSchedule.secondOffense) {
            fineAmount = fineSchedule.secondOffense;
          } else if (offenseCount === 3 && fineSchedule.thirdOffense) {
            fineAmount = fineSchedule.thirdOffense;
          } else if (fineSchedule.subsequentOffense) {
            fineAmount = fineSchedule.subsequentOffense;
          } else {
            // Fallback to highest available fine if subsequent is not defined
            fineAmount =
              fineSchedule.thirdOffense ||
              fineSchedule.secondOffense ||
              fineSchedule.firstOffense;
          }

          console.log(
            `[Progressive Fine] Final fine for ${violation.code}: ₱${fineAmount}`
          );
        }

        return {
          violationId: violation._id,
          code: violation.code,
          title: violation.title,
          description: violation.description,
          fineAmount,
          offenseCount, // Dynamic offense count based on history
        };
      })
    );

    // Calculate total amount
    const totalAmount = violationItems.reduce(
      (sum, item) => sum + item.fineAmount,
      0
    );

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
      vehicleId,
      violations: violationItems,
      totalAmount,
      amountPaid: 0,
      amountDue: totalAmount,
      issuedBy: enforcer._id,
      location,
      violationDateTime: violationDateTime || new Date(),
      issuedAt: new Date(),
      status: CitationStatus.PENDING,
      dueDate: calculatedDueDate,
      images: images || [],
      notes: notes || "",
      isVoid: false,
    });

    await citation.save();

    console.log(
      `[Citation Create] Request ID: ${requestId} - Success - Citation No: ${citationNo}`
    );

    // Populate references before returning
    await citation.populate([
      {
        path: "driverId",
        select: "firstName middleName lastName licenseNo contactNo email",
      },
      {
        path: "vehicleId",
        select:
          "plateNo vehicleType make vehicleModel color ownerFirstName ownerMiddleName ownerLastName",
      },
      {
        path: "issuedBy",
        select: "badgeNo name",
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Citation created successfully",
      data: citation,
    });
  } catch (error: any) {
    console.error(`[Citation Create] Request ID: ${requestId} - Error:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to create citation",
      details: error.message,
    });
  }
};

export const getAllCitations = async (req: Request, res: Response) => {
  try {
    const {
      status,
      enforcerId,
      driverId,
      search,
      citationNo,
      plateNo,
      licenseNo,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = { isVoid: false };

    // Only filter by status if explicitly provided
    if (status && status !== "all") {
      query.status = status;
    }

    if (enforcerId) query.issuedBy = enforcerId;
    if (driverId) query.driverId = driverId;

    // Search functionality
    if (search) {
      // General search across multiple fields
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ citationNo: searchRegex }];
    }

    // Specific field searches
    if (citationNo) {
      query.citationNo = { $regex: citationNo, $options: "i" };
    }

    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === "desc" ? -1 : 1 };

    let citationQuery = Citation.find(query)
      .populate("driverId", "firstName lastName licenseNo")
      .populate("vehicleId", "plateNo vehicleType make vehicleModel color")
      .populate("issuedBy", "badgeNo name")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    let citations = await citationQuery;

    // Post-population filtering for license number and plate number
    if (licenseNo) {
      citations = citations.filter((citation: any) => {
        return citation.driverId?.licenseNo
          ?.toLowerCase()
          .includes((licenseNo as string).toLowerCase());
      });
    }

    if (plateNo) {
      citations = citations.filter((citation: any) => {
        return citation.vehicleId?.plateNo
          ?.toLowerCase()
          .includes((plateNo as string).toLowerCase());
      });
    }

    // Get total count (need to run the query without pagination for accurate count)
    let totalQuery = Citation.find(query);
    let totalCitations = await totalQuery;

    // Apply post-population filtering to total count as well
    if (licenseNo || plateNo) {
      const populatedTotalCitations = await Citation.find(query)
        .populate("driverId", "licenseNo")
        .populate("vehicleId", "plateNo");

      totalCitations = populatedTotalCitations.filter((citation: any) => {
        let matches = true;
        if (licenseNo) {
          matches =
            matches &&
            citation.driverId?.licenseNo
              ?.toLowerCase()
              .includes((licenseNo as string).toLowerCase());
        }
        if (plateNo) {
          matches =
            matches &&
            citation.vehicleId?.plateNo
              ?.toLowerCase()
              .includes((plateNo as string).toLowerCase());
        }
        return matches;
      });
    }

    const total = totalCitations.length;

    return res.status(200).json({
      success: true,
      data: citations,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      filters: {
        status,
        enforcerId,
        driverId,
        search,
        citationNo,
        plateNo,
        licenseNo,
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    console.error("Error fetching citations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch citations",
      details: error.message,
    });
  }
};

export const getCitationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid citation ID",
      });
    }

    const citation = await Citation.findById(id)
      .populate("driverId", "firstName lastName licenseNo contactNo")
      .populate(
        "vehicleId",
        "plateNo vehicleType make vehicleModel color ownerFirstName ownerMiddleName ownerLastName"
      )
      .populate("issuedBy", "badgeNo name email contactNo")
      .populate("violations.violationId");

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: "Citation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: citation,
    });
  } catch (error: any) {
    console.error("Error fetching citation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch citation",
      details: error.message,
    });
  }
};

export const getCitationByNumber = async (req: Request, res: Response) => {
  try {
    const { citationNo } = req.params;

    const citation = await Citation.findOne({ citationNo })
      .populate("driverId", "firstName lastName licenseNo")
      .populate(
        "vehicleId",
        "plateNo vehicleType make vehicleModel color ownerFirstName ownerMiddleName ownerLastName"
      )
      .populate("issuedBy", "badgeNo name")
      .populate("violations.violationId");

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: "Citation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: citation,
    });
  } catch (error: any) {
    console.error("Error fetching citation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch citation",
      details: error.message,
    });
  }
};

export const voidCitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid citation ID",
      });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: "Citation not found",
      });
    }

    if (citation.isVoid) {
      return res.status(400).json({
        success: false,
        error: "Citation is already voided",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "Void reason is required",
      });
    }

    await citation.voidCitation(reason, req.user?.id);

    return res.status(200).json({
      success: true,
      message: "Citation voided successfully",
      data: citation,
    });
  } catch (error: any) {
    console.error("Error voiding citation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to void citation",
      details: error.message,
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
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching statistics:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
      details: error.message,
    });
  }
};

export const updateCitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, images, dueDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid citation ID",
      });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({
        success: false,
        error: "Citation not found",
      });
    }

    if (citation.isVoid) {
      return res.status(400).json({
        success: false,
        error: "Cannot update a voided citation",
      });
    }

    // Update allowed fields
    if (notes !== undefined) citation.notes = notes;
    if (images !== undefined) citation.images = images;
    if (dueDate !== undefined) citation.dueDate = new Date(dueDate);

    await citation.save();

    return res.status(200).json({
      success: true,
      message: "Citation updated successfully",
      data: citation,
    });
  } catch (error: any) {
    console.error("Error updating citation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update citation",
      details: error.message,
    });
  }
};
