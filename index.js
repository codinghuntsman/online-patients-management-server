const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000

//-------Middleware---------
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ofmmu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri);
console.log('Server is running');

async function run() {

    try {
        await client.connect();
        const serviceCollection = client.db("Doctors_portal").collection("services");
        const bookingCollection = client.db("Doctors_portal").collection("bookings");
        const userCollection = client.db("Doctors_portal").collection("users");
        const doctorCollection = client.db("Doctors_portal").collection("doctors");

        //--------Get all data from database----------
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({ name: 1 });
            const services = await cursor.toArray();
            res.send(services);
        })


        //-----------------Warning:------------------
        // This is not the proper way
        //--------------Available services---------------------
        app.get('/available', async (req, res) => {

            const date = req.query.date;

            // step 1: get all services
            const services = await serviceCollection.find().toArray();

            // step 2: get the booking of that day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            //  step 4: for each service
            services.forEach(service => {
                const serviceBooking = bookings.filter(book => book.treatment === service.name);
                // step 5: select slots for the service booking
                const bookedSlots = serviceBooking.map(book => book.slot);
                //  step 6: select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                service.slots = available;
            })
            res.send(services);
        });

        //--------get each bookings patient--------------
        app.get('/booking', async (req, res) => {
            const patientEmail = req.query.patientEmail;
            const query = { patientEmail: patientEmail };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking);
        });


        // ---------------Load all users-------------------
        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });


        //--------add a new booking or create or entry--------------------
        app.post('/booking', async (req, res) => {
            const bookingInfo = req.body;
            const query = { treatment: bookingInfo.treatment, date: bookingInfo.date, patientName: bookingInfo.patientName }
            const exist = await bookingCollection.findOne(query);
            if (exist) {
                return res.send({ success: false, bookingInfo: exist })
            }
            const result = await bookingCollection.insertOne(bookingInfo);
            return res.send({ success: true, result });
        });

        //---------------Add a doctor---------------
        app.post('/doctor', async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result);
        });

        //------------------Manage Doctors----------------------
        app.get('/doctor', async (req, res) => {
            const doctors = await doctorCollection.find().toArray();
            res.send(doctors);
        });

        //------------------Delete one Doctor----------------------
        app.delete('/doctor/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await doctorCollection.deleteOne(filter);
            res.send(result);
        });

        //--------Update or Entry user email--------------
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            // const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send(result);
        });

        //----------------Admin Role-------------
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const requester = req.params.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role == 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: "Forbidden" })
            }

        });

        //-------------IS ADMIN-----------
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        })


        /**
         * API naming convention
         * app.get('/booking')// get all booking in this collection or get more than one by filter
         * app.get('/booking/:id')// get a specific booking
         * app.post('/booking')// add anew booking ,Create operation
         * app.patch('/booking/:id')// update a specific booking
         * app.delete('/booking/:id')// delete a specific booking
        */
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Doctors portal !')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})