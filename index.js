const jwt = require("jsonwebtoken");
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const bcrypt = require("bcrypt");

// middleware
app.use(express.json());
app.use(cors());

// verifying jwt token
// const verifyJWT = (req, res, next) => {
//   const authorization = req.headers.authorization;
//   if (!authorization) {
//     return res
//       .status(401)
//       .send({ error: true, message: "unauthorized access" });
//   }
//   // bearer token
//   const token = authorization.split(" ")[1];

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res
//         .status(401)
//         .send({ error: true, message: "unauthorized access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
// };

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-hzckllx-shard-00-00.wvig2d6.mongodb.net:27017,ac-hzckllx-shard-00-01.wvig2d6.mongodb.net:27017,ac-hzckllx-shard-00-02.wvig2d6.mongodb.net:27017/?ssl=true&replicaSet=atlas-sxh7jl-shard-0&authSource=admin&retryWrites=true&w=majority`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wvig2d6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const paymentCollection = client
      .db("habibiShipping")
      .collection("successfulPayment");
    const usersCollection = client
      .db("habibiShipping")
      .collection("usersCollection");

    app.post("/calculate-price", async (req, res) => {
      const product = req.body;
      let fare;
      const weight = product.weight;
      const quantity = product.quantity;
      const totalWeight = weight * quantity;
      const distance = districts[product.destination];
      if (distance <= 30) {
        if (totalWeight === 1) {
          fare = 50;
        } else {
          fare = 50 + (totalWeight - 1) * 20;
        }
      }
      if (distance > 30) {
        if (totalWeight === 1) {
          fare = 50 + 0.5 * (distance - 30);
        } else {
          fare = 50 + (totalWeight - 1) * 20 + 0.5 * (distance - 30);
        }
      }
      res.send({ fare });
    });

    // create-payment-intent
    app.post("/create-payment-intent", async (req, res) => {
      const { finalPrice } = req.body;
      const amount = finalPrice * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "bdt",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/successful-payment", async (req, res) => {
      const paymentInfo = req.body;
      const result = await paymentCollection.insertOne(paymentInfo);
      res.send(result);
    });
    app.post("/login", async (req, res) => {
      const user = req.body;
      const password = user.password;
      const email = user.email;
      const existingUser = await usersCollection.findOne({ email });
      if (!existingUser) {
        return res.status(404).send({ error: true, message: "User not found" });
      }
      bcrypt.compare(password, existingUser.password, (err, result) => {
        if (err) {
          return res.status(500).send({ error: true, message: "Password comparison failed" });
        }

        if (result) {
          // Passwords match, generate JWT token
          const token = jwt.sign(
            { email: existingUser.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1h" }
          );
          res.status(200).send({ message: "Login successful", token });
        } else {
          // Passwords do not match
          res.status(401).send({ error: true, message: "Invalid credentials" });
        }
      });
    });
    app.post("/newUser", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      const password = newUser.password;
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .send({ error: true, message: "Email already in use" });
      }
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, async (err, hashedPassword) => {
        if (err) {
          return res
            .status(500)
            .send({ error: true, message: "Password hashing failed" });
        }
        const user = { name: newUser.name, email, password: hashedPassword };
        const result = await usersCollection.insertOne(user);
        res
          .status(201)
          .send({ message: "User registered successfully", result });
      });
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Habibi Shipping server is running");
});

app.listen(port, () => {
  console.log("Habibi Shipping is running on", port);
});

const districts = {
  Sylhet: "248",
  Chittagong: "295",
  Khulna: "271",
  Barisal: "185",
  Rajshahi: "258",
  Rangpur: "309",
  Mymensingh: "121",
  Narsingdi: "52",
  Brahmanbaria: "107",
  Kishoreganj: "143",
  Jamalpur: "181",
  Comilla: "94",
  Feni: "151",
  Noakhali: "190",
  Panchagarh: "444",
  Thakurgaon: "408",
  "Cox's Bazar": "388",
  Dinajpur: "383",
  Nilphamari: "361",
  Kurigram: "350",
  Lalmonirhat: "346",
  Barguna: "327",
  Rangamati: "314",
  Bandarban: "311",
  Natore: "220",
  Narayanganj: "17",
  Munshiganj: "27",
  Manikganj: "64",
  Gazipur: "37",
  Netrokona: "159",
  Tangail: "98",
  Shariatpur: "238",
  Rajbari: "136",
  Gopalganj: "232",
  Madaripur: "220",
  Faridpur: "145",
  Sherpur: "203",
  Lakshmipur: "216",
  Chandpur: "169",
  Sunamganj: "346",
  Moulvibazar: "214",
  Habiganj: "179",
  Khagrachari: "275",
  Naogaon: "283",
  Chapainawabganj: "320",
  Pabna: "161",
  Sirajganj: "142",
  Bogura: "228",
  Joypurhat: "280",
  Gaibandha: "301",
  Bagerhat: "270",
  Satkhira: "343",
  Jashore: "273",
  Magura: "201",
  Narail: "307",
  Kushtia: "277",
  Jhenaidah: "228",
  Chuadanga: "267",
  Meherpur: "312",
  Jhalokathi: "290",
  Pirojpur: "304",
  Bhola: "317",
  Patuakhali: "319",
};
