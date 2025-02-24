const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const categoryRouter = require("./routes/categoryRouter");
const productRouter = require("./routes/productRouter");
const userRouter = require("./routes/userRouter");

//connect to mongodb
mongoose
  .connect(process.env.MONGO_DB_URI)
  .then(() => console.log("Connected to MongoDB database"))
  .catch((err) => console.log("Could not connect to MongoDB", err));

//Configurations
app.use(express.json());

//API
app.get("/", (req, res) => {
  res.send("Hello World nha");
});

//CRUD category
app.use("/api/category", categoryRouter);

//CRUD product
app.use("/api/product", productRouter);

//Authen
app.use("api/user", userRouter)

//Listen to port 3000
let PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
