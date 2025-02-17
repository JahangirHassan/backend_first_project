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







/*
;(async ()=>{

    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error", (err)=>{
            console.error(`MongoDB connection error: ${err.message}`);
            throw err;
        })


        app.listen( process.env.PORT, ()=>{
            console.log(`Server running on port ${process.env.PORT}`);
            console.log(`Connected to MongoDB: ${DB_NAME}`);
        } )

    }
    catch(err){
        console.error(`Failed to connect to MongoDB: ${err.message}`);
       throw err
    }

})()*/