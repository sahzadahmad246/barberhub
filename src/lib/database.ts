import mongoose from 'mongoose';

interface ConnectionObject {
  isConnected?: number;
}

const connection: ConnectionObject = {};

async function connectDB(): Promise<void> {
  // Check if we have a connection to the database or if it's currently connecting
  if (connection.isConnected) {
    console.log('Already connected to MongoDB');
    return;
  }

  try {
    // Attempt to connect to the database
    const db = await mongoose.connect(process.env.MONGODB_URI || '', {
      dbName: 'barberhub',
    });

    connection.isConnected = db.connections[0].readyState;

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    
    // Exit the process with failure
    process.exit(1);
  }
}

export default connectDB;