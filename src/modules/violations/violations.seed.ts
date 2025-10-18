/**
 * Seed file for DOTC JAO NO. 2014-01 Violations
 * This file contains the violations data from the DOTC JAO 2014-01 table
 * 
 * Usage:
 * - Can be used directly with the bulk create endpoint
 * - Or run as a standalone script to seed the database
 */

export const dotcJao2014Violations = [
  // 1h - Helmet violation (R.A 10054)
  {
    code: '1h',
    title: 'Failure to wear standard protective Motorcycle helmet',
    description: 'Failure to wear the standard protective Motorcycle helmet or failure to require the back rider to wear standard protective Motorcycle helmet (R.A 10054)',
    legalReference: 'R.A 10054',
    fineStructure: 'PROGRESSIVE',
    progressiveFine: {
      private: {
        driver: {
          firstOffense: 1500.00,
          secondOffense: 3000.00,
          thirdOffense: 5000.00,
          subsequentOffense: 10000.00
        },
        mvOwner: {
          firstOffense: 0,
          secondOffense: 0,
          thirdOffense: 0,
          subsequentOffense: 0
        }
      },
      forHire: {
        driver: {
          firstOffense: 0,
          secondOffense: 0,
          thirdOffense: 0,
          subsequentOffense: 0
        },
        operator: {
          firstOffense: 0,
          secondOffense: 0,
          thirdOffense: 0,
          subsequentOffense: 0
        }
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // R.A 10054 - Substandard helmet
  {
    code: 'R.A 10054',
    title: 'Wearing substandard helmet or without ICC sticker',
    description: 'Wearing substandard helmet or without ICC sticker (R.A 10054 Sec. 7c)',
    legalReference: 'R.A 10054 Sec. 7c',
    fineStructure: 'PROGRESSIVE',
    progressiveFine: {
      private: {
        driver: {
          firstOffense: 3000.00,
          secondOffense: 5000.00
        },
        mvOwner: {
          firstOffense: 0,
          secondOffense: 0
        }
      },
      forHire: {
        driver: {
          firstOffense: 0,
          secondOffense: 0
        },
        operator: {
          firstOffense: 0,
          secondOffense: 0
        }
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // 1i - License/Registration violations
  {
    code: '1i',
    title: 'Failure to carry required documents',
    description: "Failure to carry Driver's License - Failure to carry Certificate of Registration or Official Receipt (OR/CR) while driving.",
    legalReference: 'DOTC JAO 2014-01',
    fineStructure: 'FIXED',
    fixedFine: {
      private: {
        driver: 0,
        mvOwner: 1000.00
      },
      forHire: {
        driver: 1000.00,
        operator: 0
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // 1j1 - Illegal Parking
  {
    code: '1j1',
    title: 'Illegal Parking',
    description: 'Illegal Parking: a. In an intersection, b. Within 5 meters of the intersection, c. 4 meters from the driveway entrance, d. Within 4 meters from a fire hydrant, e. In front of a private driveway, f. On the roadway side of any unmoving or parked MV at the curb or edge of the highway, g. At any place where signs of prohibitions have been installed',
    legalReference: 'DOTC JAO 2014-01',
    fineStructure: 'FIXED',
    fixedFine: {
      private: {
        driver: 1000.00,
        mvOwner: 0
      },
      forHire: {
        driver: 1000.00,
        operator: 0
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // 1j2 - Disregarding Traffic Signs
  {
    code: '1j2',
    title: 'Disregarding Traffic Signs',
    description: 'Disregarding Traffic Signs',
    legalReference: 'DOTC JAO 2014-01',
    fineStructure: 'FIXED',
    fixedFine: {
      private: {
        driver: 1000.00,
        mvOwner: 0
      },
      forHire: {
        driver: 1000.00,
        operator: 0
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // 1j3 - Allowing passengers on top or cover
  {
    code: '1j3',
    title: 'Allowing passengers on top or cover of motor vehicle',
    description: 'Allowing passengers on top or cover of a motor vehicle except in a truck helper',
    legalReference: 'DOTC JAO 2014-01',
    fineStructure: 'FIXED',
    fixedFine: {
      private: {
        driver: 1000.00,
        mvOwner: 0
      },
      forHire: {
        driver: 1000.00,
        operator: 0
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // 1j4 - Failure to provide canvas cover
  {
    code: '1j4',
    title: 'Failure to provide canvas cover to cargos or freight',
    description: 'Failure to provide canvas cover to cargos or freight of trucks requiring the same',
    legalReference: 'DOTC JAO 2014-01',
    fineStructure: 'FIXED',
    fixedFine: {
      private: {
        driver: 1000.00,
        mvOwner: 0
      },
      forHire: {
        driver: 1000.00,
        operator: 0
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  },

  // 1j5 - Permitting passenger to ride on running board
  {
    code: '1j5',
    title: 'Permitting passenger to ride on running board or step-board',
    description: 'Permitting passenger to ride on running board, step-board or mudguard of Motor Vehicle while in motion',
    legalReference: 'DOTC JAO 2014-01',
    fineStructure: 'FIXED',
    fixedFine: {
      private: {
        driver: 1000.00,
        mvOwner: 0
      },
      forHire: {
        driver: 1000.00,
        operator: 0
      }
    },
    accessoryPenalty: 'NONE',
    remarks: 'NONE'
  }
];

// If running this file directly (as a seed script)
if (require.main === module) {
  // Import necessary modules
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  const path = require('path');

  // Load environment variables
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

  // Import Violation model
  const Violation = require('../../models/violations.model').default;

  const seedViolations = async () => {
    try {
      // Connect to MongoDB
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecitation';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');

      // Clear existing violations (optional - comment out if you want to keep existing data)
      // await Violation.deleteMany({});
      // console.log('🗑️  Cleared existing violations');

      // Create violations
      for (const violationData of dotcJao2014Violations) {
        const violationGroupId = new mongoose.Types.ObjectId().toString();
        
        const violation = new Violation({
          ...violationData,
          violationGroupId,
          version: 1,
          effectiveFrom: new Date(),
          isActive: true
        });

        await violation.save();
        console.log(`✅ Created violation: ${violationData.code} - ${violationData.title}`);
      }

      console.log(`\n🎉 Successfully seeded ${dotcJao2014Violations.length} violations!`);
      
      // Disconnect
      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error seeding violations:', error);
      process.exit(1);
    }
  };

  seedViolations();
}
