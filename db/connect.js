
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config()

const DB = process.env.URL

const connectDB = async() =>{
  try {
    await mongoose.connect(`mongodb+srv://${DB}`)
    console.log("MongoDB Connected!!!");
  }
  catch (error) {
    console.log("MongoDB connection error", error);
  }
}

export default connectDB