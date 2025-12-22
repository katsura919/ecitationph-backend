import { Request, Response } from "express";
import Citation, {
  ICitation,
  CitationStatus,
} from "../../../models/citation.model";
import mongoose from "mongoose";

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
      startTime,
      endTime,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = { isVoid: false };

    // Only filter by status if explicitly provided
    // Support both single status and array of statuses
    if (status && status !== "all") {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (typeof status === "string" && status.includes(",")) {
        // Support comma-separated statuses
        query.status = { $in: status.split(",").map((s) => s.trim()) };
      } else {
        query.status = status;
      }
    }

    if (enforcerId) query.issuedBy = enforcerId;
    if (driverId) query.driverId = driverId;

    // Specific field searches
    if (citationNo) {
      query.citationNo = { $regex: citationNo, $options: "i" };
    }

    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (startTime) {
          const [hours, minutes] = (startTime as string).split(":");
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (endTime) {
          const [hours, minutes] = (endTime as string).split(":");
          end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === "desc" ? -1 : 1 };

    // Build aggregation pipeline for searching with driver data
    const aggregationPipeline: any[] = [
      { $match: query },
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driverData",
        },
      },
      {
        $unwind: {
          path: "$driverData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "enforcers",
          localField: "issuedBy",
          foreignField: "_id",
          as: "enforcerData",
        },
      },
      {
        $unwind: {
          path: "$enforcerData",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Add search filter if provided (searches citation number, driver name, and license number)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      aggregationPipeline.push({
        $match: {
          $or: [
            { citationNo: searchRegex },
            { "driverData.firstName": searchRegex },
            { "driverData.middleName": searchRegex },
            { "driverData.lastName": searchRegex },
            { "driverData.licenseNo": searchRegex },
          ],
        },
      });
    }

    // Add license number filter if provided
    if (licenseNo) {
      aggregationPipeline.push({
        $match: {
          "driverData.licenseNo": { $regex: licenseNo, $options: "i" },
        },
      });
    }

    // Get total count before pagination
    const countPipeline = [...aggregationPipeline, { $count: "total" }];
    const countResult = await Citation.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting, pagination, and projection
    aggregationPipeline.push(
      { $sort: sort },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 1,
          citationNo: 1,
          status: 1,
          violations: 1,
          totalAmount: 1,
          createdAt: 1,
          violationDateTime: 1,
          driverId: {
            _id: "$driverData._id",
            firstName: "$driverData.firstName",
            middleName: "$driverData.middleName",
            lastName: "$driverData.lastName",
            licenseNo: "$driverData.licenseNo",
            email: "$driverData.email",
            sex: "$driverData.sex",
            agencyCode: "$driverData.agencyCode",
          },
          issuedBy: {
            _id: "$enforcerData._id",
            name: "$enforcerData.name",
            badgeNo: "$enforcerData.badgeNo",
          },
        },
      }
    );

    const citations = await Citation.aggregate(aggregationPipeline);

    // Get counts for each status (for the cards)
    const baseQuery = { isVoid: false };

    // Apply same date/time filters to count queries
    if (startDate || endDate) {
      (baseQuery as any).createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (startTime) {
          const [hours, minutes] = (startTime as string).split(":");
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        (baseQuery as any).createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (endTime) {
          const [hours, minutes] = (endTime as string).split(":");
          end.setHours(parseInt(hours), parseInt(minutes), 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }
        (baseQuery as any).createdAt.$lte = end;
      }
    }

    const [allCount, pendingCount, overdueCount, resolvedCount] =
      await Promise.all([
        Citation.countDocuments(baseQuery),
        Citation.countDocuments({
          ...baseQuery,
          status: CitationStatus.PENDING,
        }),
        Citation.countDocuments({
          ...baseQuery,
          status: CitationStatus.OVERDUE,
        }),
        Citation.countDocuments({ ...baseQuery, status: CitationStatus.PAID }),
      ]);

    return res.status(200).json({
      success: true,
      data: citations,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      counts: {
        all: allCount,
        pending: pendingCount,
        overdue: overdueCount,
        resolved: resolvedCount,
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
        startTime,
        endTime,
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
