import { Request, Response } from "express";
import Citation, { CitationStatus } from "../../../models/citation.model";
import Violation from "../../../models/violations.model";
import Enforcer from "../../../models/enforcer.model";
import Driver from "../../../models/driver.model";
import Vehicle from "../../../models/vehicle.model";
import mongoose from "mongoose";

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

    // Verify enforcer exists
    const enforcer = await Enforcer.findById(req.user?.id);
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
