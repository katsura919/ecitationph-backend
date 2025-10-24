import mongoose from 'mongoose';
import { ICitation, ICitationModel, CitationStatus } from '../../models/citation.model';

/**
 * STATIC METHODS
 * Methods that operate on the Citation model/collection level
 */

/**
 * Generate unique citation number
 * Format: TCT-YYYY-NNNNNN (e.g., TCT-2025-000001)
 */
export async function generateCitationNo(CitationModel: ICitationModel): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TCT-${year}-`;
  
  // Find the latest citation number for this year
  const lastCitation = await CitationModel.findOne({
    citationNo: new RegExp(`^${prefix}`)
  }).sort({ citationNo: -1 });
  
  let nextNumber = 1;
  if (lastCitation) {
    const lastNumber = parseInt(lastCitation.citationNo.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  // Format: TCT-2025-000001
  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Get all citations issued to a specific driver
 */
export async function getByDriver(
  CitationModel: ICitationModel,
  driverId: mongoose.Types.ObjectId
): Promise<ICitation[]> {
  return CitationModel.find({ driverId })
    .populate('issuedBy', 'badgeNo name')
    .sort({ createdAt: -1 });
}

/**
 * Get all citations issued by a specific enforcer
 */
export async function getByEnforcer(
  CitationModel: ICitationModel,
  enforcerId: mongoose.Types.ObjectId
): Promise<ICitation[]> {
  return CitationModel.find({ issuedBy: enforcerId })
    .populate('driverId', 'firstName lastName licenseNo')
    .sort({ createdAt: -1 });
}

/**
 * Get all overdue citations
 */
export async function getOverdueCitations(CitationModel: ICitationModel): Promise<ICitation[]> {
  const now = new Date();
  return CitationModel.find({
    dueDate: { $lt: now },
    status: { $in: [CitationStatus.PENDING, CitationStatus.PARTIALLY_PAID] },
    isVoid: false
  }).sort({ dueDate: 1 });
}

/**
 * Get citation statistics
 */
export async function getStatistics(
  CitationModel: ICitationModel,
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const matchStage: any = { isVoid: false };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const stats = await CitationModel.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCitations: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalCollected: { $sum: '$amountPaid' },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', CitationStatus.PENDING] }, 1, 0] }
        },
        paid: {
          $sum: { $cond: [{ $eq: ['$status', CitationStatus.PAID] }, 1, 0] }
        },
        overdue: {
          $sum: { $cond: [{ $eq: ['$status', CitationStatus.OVERDUE] }, 1, 0] }
        },
        contested: {
          $sum: { $cond: [{ $eq: ['$status', CitationStatus.CONTESTED] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalCitations: 0,
    totalAmount: 0,
    totalCollected: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    contested: 0
  };
}

/**
 * Search citations with filters
 */
export async function searchCitations(
  CitationModel: ICitationModel,
  filters: {
    citationNo?: string;
    plateNo?: string;
    licenseNo?: string;
    status?: CitationStatus;
    enforcerId?: mongoose.Types.ObjectId;
    driverId?: mongoose.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<ICitation[]> {
  const query: any = { isVoid: false };

  if (filters.citationNo) {
    query.citationNo = { $regex: filters.citationNo, $options: 'i' };
  }

  if (filters.plateNo) {
    query['vehicleInfo.plateNo'] = { $regex: filters.plateNo, $options: 'i' };
  }

  if (filters.licenseNo) {
    query['driverInfo.licenseNo'] = { $regex: filters.licenseNo, $options: 'i' };
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.enforcerId) {
    query.issuedBy = filters.enforcerId;
  }

  if (filters.driverId) {
    query.driverId = filters.driverId;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  return CitationModel.find(query)
    .populate('driverId', 'firstName lastName licenseNo')
    .populate('issuedBy', 'badgeNo name')
    .sort({ createdAt: -1 })
    .limit(100);
}

/**
 * INSTANCE METHODS
 * Methods that operate on individual citation documents
 */

/**
 * Calculate total amount from violations
 */
export function calculateTotalAmount(citation: ICitation): number {
  if (!citation.violations || citation.violations.length === 0) {
    return 0;
  }
  return citation.violations.reduce((sum: number, violation: any) => sum + violation.fineAmount, 0);
}

/**
 * Mark citation as fully paid
 */
export async function markAsPaid(citation: ICitation): Promise<ICitation> {
  citation.status = CitationStatus.PAID;
  citation.amountDue = 0;
  await citation.save();
  return citation;
}

/**
 * Contest a citation
 */
export async function contestCitation(
  citation: ICitation,
  reason: string,
  contestedBy: mongoose.Types.ObjectId
): Promise<ICitation> {
  citation.status = CitationStatus.CONTESTED;
  citation.contestedAt = new Date();
  citation.contestReason = reason;
  citation.contestedBy = contestedBy;
  await citation.save();
  return citation;
}

/**
 * Resolve a contested citation
 */
export async function resolveContest(
  citation: ICitation,
  resolution: string,
  resolvedBy: mongoose.Types.ObjectId,
  approve: boolean
): Promise<ICitation> {
  citation.contestResolution = resolution;
  citation.contestResolvedAt = new Date();
  citation.contestResolvedBy = resolvedBy;
  
  if (approve) {
    citation.status = CitationStatus.DISMISSED;
  } else {
    // Revert to previous status or set to pending
    citation.status = citation.amountPaid > 0 
      ? CitationStatus.PARTIALLY_PAID 
      : CitationStatus.PENDING;
  }
  
  await citation.save();
  return citation;
}

/**
 * Void a citation (cancel)
 */
export async function voidCitation(
  citation: ICitation,
  reason: string,
  voidedBy: mongoose.Types.ObjectId
): Promise<ICitation> {
  citation.status = CitationStatus.VOID;
  citation.isVoid = true;
  citation.voidReason = reason;
  citation.voidedBy = voidedBy;
  citation.voidedAt = new Date();
  await citation.save();
  return citation;
}

/**
 * Check if citation is overdue
 */
export function checkOverdue(citation: ICitation): boolean {
  return citation.dueDate < new Date() && 
         (citation.status === CitationStatus.PENDING || 
          citation.status === CitationStatus.PARTIALLY_PAID);
}

/**
 * Update citation status based on due date and payment
 */
export async function updateStatus(citation: ICitation): Promise<ICitation> {
  // Check if overdue
  if (checkOverdue(citation) && citation.status !== CitationStatus.OVERDUE) {
    citation.status = CitationStatus.OVERDUE;
    await citation.save();
  }
  
  // Check if fully paid
  if (citation.amountPaid >= citation.totalAmount && citation.status !== CitationStatus.PAID) {
    citation.status = CitationStatus.PAID;
    citation.amountDue = 0;
    await citation.save();
  }
  
  return citation;
}

/**
 * Get citation summary for display
 */
export function getCitationSummary(citation: ICitation): any {
  // Note: driverId needs to be populated to get driver name
  return {
    citationNo: citation.citationNo,
    driverId: citation.driverId,
    plateNo: citation.vehicleInfo.plateNo,
    violationsCount: citation.violations.length,
    totalAmount: citation.totalAmount,
    amountPaid: citation.amountPaid,
    amountDue: citation.amountDue,
    status: citation.status,
    violationDateTime: citation.violationDateTime,
    issuedAt: citation.issuedAt,
    dueDate: citation.dueDate,
    isOverdue: checkOverdue(citation),
    location: `${citation.location.barangay}, ${citation.location.city}`,
    enforcerBadgeNo: citation.enforcerInfo.badgeNo
  };
}
