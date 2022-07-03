const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000

//-------Middleware---------
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ofmmu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri);

async function run() {

    try {
        await client.connect();
        const serviceCollection = client.db("Doctors_portal").collection("services");
        const bookingCollection = client.db("Doctors_portal").collection("bookings");

        //--------Get all data from database----------
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
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

        })

        //--------add a new booking or create--------------------
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