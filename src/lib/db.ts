import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @returns Promise<void>
 */
export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB;

    if (!mongoURI) {
      throw new Error('MONGODB connection string is not defined in .env file');
    }

    await mongoose.connect(mongoURI);

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1); // Exit process with failure
  }
};

/**
 * Disconnect from MongoDB database
 * @returns Promise<void>
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('👋 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};
