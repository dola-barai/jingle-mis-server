const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
app.use(cors());
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dkm5by0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const instructorsCollection = client.db('jingleDb').collection('instructors')
    const classesCollection = client.db('jingleDb').collection('classes')
    const reviewsCollection = client.db('jingleDb').collection('reviews')
    const selectedClassCollection = client.db('jingleDb').collection('selectedClass')
    const usersCollection = client.db('jingleDb').collection('users')
    const paymentCollection = client.db('jingleDb').collection('payment')
    const addClassCollection = client.db('jingleDb').collection('newClass')

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result)
    })

    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result)
    })


    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.get('/newClass', async (req, res) => {
      const result = await addClassCollection.find().toArray();
      res.send(result)
    })

    app.get('/newClassIns', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' })
      }

      const query = { email: email }
      const result = await addClassCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/payments', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' })
      }

      const query = { email: email }
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
      res.send(result)
    })

    app.get('/selectedClass', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' })
      }

      const query = { email: email }
      const result = await selectedClassCollection.find(query).toArray()
      res.send(result)
    })


    app.post('/selectedClass', async (req, res) => {
      const item = req.body;
      const result = await selectedClassCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/selectedClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result)
    })



    app.post('/users', async (req, res) => {
      const user = req.body;

      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)

      if (existingUser) {
        return res.send({ message: 'user already exist' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })

    app.get('/users/student/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ student: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { student: user?.role === 'student' }
      res.send(result)
    })

    app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/users/instructor/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/users/student/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'student'
        },
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.get('/newClass/:id', async(req, res) => {
      const _id = req.params.id;
      const query = { _id: new ObjectId(_id) }
      const result = await addClassCollection.findOne(query);
      res.send(result)
      console.log(result);
    });

    app.post('/newClass', async (req, res) => {
      const newClass = req.body;
      
      const result = await addClassCollection.insertOne(newClass)
      
      res.send(result)
      console.log(result);
    })

    app.put('/newClass/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true };
      const updateClass = req.body;

      const nClass = {
          $set: {
              cname: updateClass.cname, 
              price: updateClass.price, 
              seats: updateClass.seats, 
          }
      }

      const result = await addClassCollection.updateOne(filter, nClass, options);
      res.send(result);
  })

    app.patch('/newClass/approve/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Approve'
        },
      }
      const result = await addClassCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    app.patch('/newClass/reject/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Reject'
        },
      }
      const result = await addClassCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment related API
    app.post('/payments', verifyJWT, async (req, res) => {
      try {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
        let query = {}; // Declare the query variable with a default value
    
        if (Array.isArray(payment.cartItemId)) {
          query = { _id: { $in: payment.cartItemId.map(id => new ObjectId(id)) } };
        }
    
        const deleteResult = await selectedClassCollection.deleteMany(query);
        const classUpdate = {
          $inc: {
            availableSeats: -1,
            enrolledStudents: 1 // Remove the '+' sign, as it is not needed
          }
        };
    
        const updateResult = await classesCollection.updateMany(query, classUpdate);
    
        res.send({ insertResult, deleteResult, updateResult });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('jingle is OK now')
})

app.listen(port, () => {
  console.log(`JINGLE is sitting on port ${port}`);
})