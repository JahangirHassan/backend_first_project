import dotenv from "dotenv"
import dbConnection from "./db/dbConnections.js"
import { app } from "./app.js";

dotenv.config({
    path: './.env'
});

const PORT= process.env.PORT || 8000;

dbConnection()
.then(()=>{
    app.listen(PORT, ()=>{
        console.log(`server is running at PORT ${PORT}`)
    })
})
.catch((err)=>{
    console.error(`Failed to connect to MongoDB: ${err}`);
    process.exit(1);
 });
 
