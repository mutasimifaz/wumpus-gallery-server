const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s7xebih.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized Access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const wumpusesCollection = client
      .db("wumpus-gallery")
      .collection("wumpuses");
    const usersCollection = client.db("wumpus-gallery").collection("users");
    app.get("/wumpuses", async (req, res) => {
      const query = {};
      const cursor = wumpusesCollection.find(query);
      const wumpuses = await cursor.toArray();
      res.send(wumpuses);
    });

    app.post("/wumpuses", verifyJWT, async (req, res) => {
      const wumpus = req.body;
      const result = await wumpusesCollection.insertOne(wumpus);
      res.send(result);
    });
    app.delete("/wumpus/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };

      const result = await wumpusesCollection.deleteOne(filter);
      res.send(result);
    });
    app.get("/wumpus", verifyJWT, async (req, res) => {
      const u_email = req.query.u_email;
      const query = { u_email: u_email };
      // const cursor = wumpusesCollection.find(query);
      const wumpus = await wumpusesCollection.find(query).toArray();
      res.send(wumpus);
    });
    app.get("/wumpus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await wumpusesCollection.findOne(query);
      res.send(result);
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    });
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    });
    app.put("/wumpus/:id", async (req, res) => {
      const wumpus = req.body;
      const filter = { _id: ObjectId(req.params.id) };
      const updateDoc = { $set: wumpus };
      const result = await wumpusesCollection.updateOne(filter, updateDoc);
      res.json(result);
    });
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    app.get("/users", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email: email });
      res.send(result);
    });
    app.get("/profiles/:url", verifyJWT, async (req, res) => {
      const url = req.params.url;
      const result = await usersCollection.findOne({ url: url });
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.use("*", cors());
// app.options("*", cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Wumpus Gallery server is running");
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
