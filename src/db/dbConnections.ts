import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";





 const dbConnection= async (): Promise <void>=>{
    try {
       const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log(`\nConnected to MongoDB!! DB HOST: ${connectionInstance.connection.host} `);
    }
    catch (err) {
        console.error(`Error connecting to MongoDB: ${err}`);
        process.exit(1);

    }
}
export default dbConnection;