import { Request, Response } from 'express';
import Driver from '../../models/driver.model';

/**
 * @route   GET /api/drivers?search=keyword&page=1&limit=20
 * @desc    Get all drivers with optional search and pagination
 *          - If search is empty: fetch all drivers
 *          - If search has value: search by firstName, lastName, or licenseNo
 * @access  Public/Admin
 */
export const getDrivers = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query: any = {};

    // Add search filter if search param is provided
    if (search && search.toString().trim()) {
      const searchStr = search.toString().trim();
      query.$or = [
        { firstName: { $regex: searchStr, $options: 'i' } },
        { lastName: { $regex: searchStr, $options: 'i' } },
        { licenseNo: { $regex: searchStr, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch drivers (excluding password)
    const drivers = await Driver.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await Driver.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: drivers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch drivers',
      details: error.message
    });
  }
};
