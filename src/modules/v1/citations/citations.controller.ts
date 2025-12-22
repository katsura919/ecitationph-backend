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
