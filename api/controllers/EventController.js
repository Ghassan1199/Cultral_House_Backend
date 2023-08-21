const db = require("../models/index");

const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const adminAuth = require("../middleware/adminAuth");



const eventEmitter = require("./eventEmitter");


const Event = db.events;
const Artist = db.artists;
const Artist_Event = db.artists_events
const Photos = db.photos
const sequelize = db.sequelize;
const ValidationError = db.ValidationError;
const Reservation = db.reservations;
const Actions = db.actions;
const Order = db.orders;
const workers_events = db.workers_events;
const Op = db.Op;
const Worker = db.workers;
const Drink = db.drinks;




const createEvent = async (req, res) => {

    const {
        title,
        description,
        ticket_price,
        available_places,
        band_name,
        begin_date,
        artists,
        artists_cost
    } = req.body;

    const token = req.headers["x-access-token"];

    if(new Date(begin_date) < new Date()){
        return res.status(400).send(responseMessage(false,"The date you added is Old"))
    }

    let transaction;

    try {

        transaction = await sequelize.transaction();

        const admin = await adminAuth(token);

        const admin_id = admin.admin_id;

        const data = {
            title,
            description,
            ticket_price,
            available_places,
            band_name,
            begin_date,
            admin_id,
            artists_cost
        };

        const event = await Event.create(data, {transaction});


        const artists_ids = artists.split(',').map(id => id.trim());
        for (const artist_id of artists_ids) {
            const artist = await Artist.findByPk(artist_id)
            if (!artist) {
                throw new RError(404, "artist not found " + artist_id);
            }
            await Artist_Event.create({
                artist_id: artist_id,
                event_id: event.event_id,
            }, {transaction})

        }

        if (req.files) {
            for (let i = 0; i < req.files.length; i++) {
                await Photos.create({
                    event_id: event.event_id,
                    picture: req.files[i].path
                }, {transaction})
            }
        }

        await transaction.commit();

        await Actions.create({
            admin_id: admin_id,
            action: "Adding New Event",
            time: Date.now(),
            details: event
        })

        eventEmitter.emit('create_new_event');

        res.status(201).send(responseMessage(true, "event is added", event));

    } catch (errors) {

        await transaction.rollback();

        let statusCode = errors.statusCode || 500;

        if (errors instanceof ValidationError) {
            statusCode = 400;
        }
        console.log(errors);

        return res.status(statusCode).send(responseMessage(false, errors.message));

    }


}

const deleteEvent = async (req, res) => {

    const token = req.headers["x-access-token"];
    const admin = await adminAuth(token);
    const admin_id = admin.admin_id;

    const event_id = req.body.event_id;

    if (!event_id) {
        res.status(400).json({
            msg: "no event_id is given"
        })
    }
    const event = await Event.findOne({
        where: {
            event_id: event_id
        }
    })

    if (event) {

        await Actions.create({
            admin_id: admin_id,
            action: "Adding New Event",
            time: Date.now(),
            details: event
        })

        event.destroy()

        return res.status(202).json({
            msg: "Event has been deleted successfully",
            data: event
        })
    } else {
        res.status(404).json({
            msg: "Event not found"
        })
    }

}

const updateEvent = async (req, res) => {

    const event = await Event.findByPk(req.body.event_id);

    const token = req.headers["x-access-token"];
    const admin = await adminAuth(token);
    const admin_id = admin.admin_id;

    if (event != null) {
        const old_event = event;
        const {title, description, ticket_price, available_places, begin_date, band_name} = req.body
        if (title != null)
            event.title = title
        if (description != null)
            event.description = description
        if (ticket_price != null)
            event.ticket_price = ticket_price
        if (available_places != null)
            event.available_places = available_places
        if (begin_date != null)
            event.begin_date = begin_date
        if (band_name != null)
            event.band_name = band_name

        try {

            await Actions.create({
                admin_id: admin_id,
                action: "Editing Event",
                time: Date.now(),
                details: {"new event": event, "old event": old_event}
            })

            await event.save();
            return res.status(202).json({
                msg: "event has been updated successfully",
                data: event
            })

        } catch (e) {
            return res.status(400).json({
                msg: e,
                requestBody: req.body
            })
        }


    } else {
        return res.status(404).json({msg: "event not found"})
    }


}


const showAllEvents = async (req, res) => {

    let events = await Event.findAll({include: Photos});
    const past = [];
    const upComing = [];
    const now = [];

    const eventDurstionInHours = 6;
    const ctDate = new Date().toLocaleString("en", {hour12: false});

    const currentDateArray = ctDate.split(/[,:]/);

    const currentDate = currentDateArray[0].split(/[/]/);
    const currentHours = currentDateArray[1];
    const currentMinutes = currentDateArray[2];


    const currentYear = currentDate[2];
    const currentMonth = currentDate[0];
    const currentDay = currentDate[1];

    

    //2023-08-07 15:00
    for (let index = 0; index < events.length; index++) {
        let event = events[index].toJSON();
        const dateObject = new Date(event.begin_date);
        const date = dateObject.toLocaleString("en", {hour12: false});
        const dateArray = date.split(/[,:]/);

        const eventDate = dateArray[0].split(/[/]/);
        const eventHours = dateArray[1];
        const eventMinutes = dateArray[2];

        const eventYear = eventDate[2];
        const eventMonth = eventDate[0];
        const eventDay = eventDate[1];

        event.begin_date = date;

        if (Number(currentYear) < Number(eventYear)) {

            upComing.push(event);

        } else if (currentYear > eventYear) {
            past.push(event);

        } else {

            if (Number(currentMonth) < Number(eventMonth)) {
                upComing.push(event);

            } else if (Number(currentMonth) > Number(eventMonth)) {
                past.push(event);

            } else {
                if (Number(currentDay) < Number(eventDay)) {
                    upComing.push(event)

                } else if (Number(currentDay) > Number(eventDay)) {
                    past.push(event);

                } else {
                    const eventDurationInMinutes =  15;

                    const currentTimeInMinutes = currentHours * 60 + Number(currentMinutes);

                    const eventTimeInMinutes = eventHours * 60 + Number(eventMinutes);

                    const eventEndTimeInMinutes = eventTimeInMinutes + Number(eventDurationInMinutes);


                    if (Number(currentTimeInMinutes) < Number(eventTimeInMinutes)) {
                        upComing.push(event);
                    } else if (Number(currentTimeInMinutes) >= Number(eventEndTimeInMinutes)) {
                        past.push(event);
                    } else {
                        now.push(event);
                    }
                }
            }
        }
    }

    events = {past, now, upComing};
    res.status(200).json({
        msg: "events has been sent successfully",
        data: events
    })
}


const showEventDetailsForCustomer = async (req, res) => {

    const event_id = req.body.event_id;

    try {

        let event = await Event.findOne({
            where: {event_id}, include: [
                Photos,
                {
                    model: Artist_Event,
                    include: Artist
                }
            ]
        });

        event = event.toJSON();

        const dateObject = new Date(event.begin_date);
        const date = dateObject.toLocaleString("en", {hour12: false});

        event.begin_date = date;


        res.status(200).send(responseMessage(true, "event is sent", event));

    } catch (errors) {


        var statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {

            statusCode = 400;

        }

        return res.status(statusCode).send(responseMessage(false, errors.message));
    }


}

const showEventDetailsForAdmin = async (req, res) => {


    const event_id = req.body.event_id;


    try {

        let event = await Event.findOne({
            where: {event_id}, include: [
                Photos,
                {
                    model: Artist_Event,
                    include: Artist
                },
                {
                    model: workers_events,
                    include: Worker
                }
            ]
        });

        event = event.toJSON();

        const dateObject = new Date(event.begin_date);
        const date = dateObject.toLocaleString("en", {hour12: false});

        event.begin_date = date;

        const reservations = await Reservation.findAll({
            where: {
                event_id
            },
            include: [
                Worker, {
                    model: Order,
                    include: {
                        model: db.orders_drinks,
                        include: Drink
                    }
                }]
        });

        let bookingIncome = 0;
        let ordersIncome = 0;
        const ticket_price = event.ticket_price;

        for (const reservation of reservations) {


            if (reservation.attendance_number != null) {
                bookingIncome += (reservation.attendance_number * ticket_price)
            }

            if (reservation.orders != 0) {

                for (const order of reservation.orders) {

                    for (const od of order.order_drinks) {

                        const drink = await Drink.findByPk(od.drink_id);

                        if (drink != null) {
                            ordersIncome += (od.quantity * drink.price);

                        }
                    }
                }
            }
        }


        const data = {event, reservations, bookingIncome, ordersIncome};

        res.status(200).send(responseMessage(true, "event is sent", data));

    } catch (errors) {

        let statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {
            statusCode = 400;

        }

        return res.status(statusCode).send(responseMessage(false, errors.message));
    }


}

/*  if (currentDay < eventDay) {
                    upComing.push(event)
                }
                else if (currentDay > eventDay) {
                    past.push(event);
                }

                else {
                    const eventDurationInMinutes = eventDurstionInHours * 60;

                    const currentTimeInMinutes = currentHours * 60 + Number(currentMinutes);

                    const eventTimeInMinutes = eventHours * 60 + Number(eventMinutes);

                    const eventEndTimeInMinutes = eventTimeInMinutes + Number(eventDurationInMinutes);


                    if (currentTimeInMinutes < eventTimeInMinutes) {
                        upComing.push(event);
                    } else if (currentTimeInMinutes >= eventEndTimeInMinutes) {
                        past.push(event);
                    } else {
                        now.push(event);
                    }
                } */


module.exports = {
    createEvent,
    showAllEvents,
    deleteEvent,
    updateEvent,
    showEventDetailsForCustomer,
    showEventDetailsForAdmin

}