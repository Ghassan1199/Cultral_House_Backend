const bcrypt = require("bcrypt");
const db = require("../models/index");

const jwt = require("jsonwebtoken");

const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const adminAuth = require("../middleware/adminAuth");

const eventEmitter = require("./eventEmitter");

const Reservation = db.reservations;
const Event = db.events;
const ValidationError = db.ValidationError;
const sequelize = db.sequelize;
const workers_events = db.workers_events;
const Orders_drinks = db.orders_drinks;
const Admin = db.admins;
const Customers = db.customers;
const Drinks = db.drinks;
const Workers = db.workers;
const Actions = db.actions;

const createAdmin = async (req, res) => {
    try {
        const { admin_name, email, password, is_super } = req.body;
        const data = {
            admin_name,
            email,
            password: await bcrypt.hash(password, 10),
            is_super
        };
        //saving the user
        const admin = await Admin.create(data);

        return res.status(201).json({
            msg: "admin created successfully",
            data: admin
        });

    } catch (error) {
        console.log(error);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ msg: "validation error" })
        }

        //find an admin by their email
        const admin = await Admin.findOne({
            where: {
                email: email
            }

        });

        //if admin email is found, compare password with bcrypt
        if (admin) {
            const isSame = await bcrypt.compare(password, admin.password);

            //if password is the same
            //generate token with the admin's id and the secretKey in the env file

            if (isSame) {
                let token = jwt.sign({ admin: admin }, process.env.SECRET, null, {
                    expiresIn: 24 * 60 * 60 * 1000,
                });

                //if password matches wit the one in the database
                //send admin data
                return res.status(200).json({
                    msg: "Logged in Successfully",
                    data: admin,
                    token: token
                });
            } else {
                return res.status(401).json({ msg: "Authentication failed" });
            }
        } else {
            return res.status(401).json({ msg: "Authentication failed" });
        }
    } catch (error) {
        console.log(error);
    }
};

const deleteAdmin = async (req, res) => {
    const admin_id = req.body.admin_id;

    if (!admin_id) {
        res.status(400).json({
            msg: "no admin_id is given"
        })
    }

    const admin = await Admin.findOne({
        where: {
            admin_id: admin_id
        }
    })

    if (admin) {

        await admin.destroy()
        return res.status(202).json({
            msg: "admin has been deleted successfully",
            data: admin
        })

    } else {
        res.status(404).json({
            msg: "Admin not found"
        })
    }

}

const showAllAdmins = async (req, res) => {
    const admins = await Admin.findAll()
    res.status(200).json({
        msg: "admin has been sent successfully",
        data: admins
    })
}

const makeReservationByAdmin = async (req, res) => {

    const token = req.headers["x-access-token"];

    try {

        const event_id = req.body.event_id;
        const customer_name = req.body.customer_name;

        if (!event_id) {
            throw new RError(400, "choose the event");
        }

        const number_of_places = req.body.number_of_places;

        if (!number_of_places) {
            throw new RError(400, "enter the number of the attendees");
        }

        const admin = await adminAuth(token);

        const admin_id = admin.admin_id;

        const event = await Event.findByPk(event_id);


        if (event == null) {
            throw new RError(404, "event not found");
        }

        if (number_of_places < 1) {
            throw new RError(400, "enter a valid number");
        }

        if (number_of_places > event.available_places) {
            throw new RError(400, "no enough spots in the events");
        }

        event.available_places -= number_of_places;

        const reservation = await Reservation.create({
            event_id,
            number_of_places,
            customer_id: null,
            customer_name

        });


        await event.save();

        await Actions.create({
            admin_id: admin_id,
            action: "Adding New Reservation",
            time: Date.now(),
            details: reservation
        })

        eventEmitter.emit('create_new_reservation');

        res.status(201).send(responseMessage(true, "reservation has been added", reservation));


    } catch (errors) {

        let statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {
            statusCode = 400;
        }

        return res.status(statusCode).send(responseMessage(false, errors.message));

    }

}

const deleteReservationByAdmin = async (req, res) => {

    const token = req.headers["x-access-token"];


    let transaction;
    try {

        transaction = await sequelize.transaction();

        const reservation_id = req.body.reservation_id;

        if (!reservation_id) {
            throw new RError(400, "choose the reservation");
        }


        const reservation = await Reservation.findByPk(reservation_id);

        if (reservation === null) {
            throw new RError(404, "reservation not found");
        }


        const admin = await adminAuth(token);

        const admin_id = admin.admin_id;


        const event_id = reservation.event_id;

        const number_of_places = reservation.number_of_places;
        const event = await Event.findByPk(event_id);

        event.available_places += number_of_places;

        await reservation.destroy({ transaction });
        await event.save({ transaction });

        await transaction.commit();

        await Actions.create({
            admin_id: admin_id,
            action: "Deleting Reservation",
            time: Date.now(),
            details: reservation
        })

        res.status(200).send(responseMessage(true, "reservation has been deleted successfully"));

    } catch (error) {
        await transaction.rollback();
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).send(responseMessage(false, error.message));

    }


}
const stats = async (req, res) => {

    // for cost
    const artistsCost = await Event.sum("artists_cost");
    const workersCost = await workers_events.sum("cost");
    let drinksCost = 0;

    //for proceeds

    let ordersProceeds = 0;
    const OD = await Orders_drinks.findAll({ include: Drinks });

    OD.forEach(od => {
        if (od["drink"] != null) {
            ordersProceeds += (od["quantity"] * od["drink"]["price"]);
        }
    });

    let reservationsProceeds = 0;

    const reservations = await Reservation.findAll({
        where: {
            attendance: {
                [db.Op.eq]: true
            }
        },

        include: Event
    });

    reservations.forEach(res => {
        reservationsProceeds += (res["attendance_number"] * res["event"]["ticket_price"]);

    });

    //////

    const upcoming_events = await Event.count({
        where: {
            begin_date: {
                [db.Op.gt]: sequelize.literal('NOW()'), // Current date and time
            },
        },
    });

    const past_events = await Event.count({
        where: {
            begin_date: {
                [db.Op.lte]: sequelize.literal('NOW()'), // Current date and time
            },
        },
    });

    const workers = await Workers.count()
    const customers = await Customers.count();
    let drinks_quantity = 0;
    const drinks = await Drinks.findAll({
        where: {
            quantity: {
                [db.Op.gt]: 0
            }
        }
    })

    drinks.forEach(drink => {
        drinks_quantity += 1;
        drinksCost += (drink["cost"] * drink["quantity"]);
    })

    const admins = await Admin.count(
        {
            where: {
                is_super: false
            }
        }
    )


    const totalCost = artistsCost + workersCost + drinksCost;
    const proceeds = ordersProceeds + reservationsProceeds;
    const profit = proceeds - totalCost;

    return res.status(200).json({
        "upcoming_events": upcoming_events,
        "past_events": past_events,
        "workers": workers,
        "customers": customers,
        "drinks": drinks_quantity,
        "admins": admins,
        "totalCost": totalCost,
        "proceeds": proceeds,
        "profit": profit
    })

}

const showReservationsForAdmin = async (req, res) => {


    const token = req.headers["x-access-token"];

    try {
        await adminAuth(token);

        const reservations = await Reservation.findAll();

        if (reservations.length === 0) {
            throw new RError(404, "no reservations found");
        }

        res.status(200).send(responseMessage(true, "reservations have been updated successfully", reservations));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

    }
}

const addWorkersToEvent = async (req, res) => {

    const token = req.headers["x-access-token"];
    const event_id = req.body.event_id;
    let workers = req.body.workers;

    try {

        if (!event_id) {
            throw new RError(400, "choose the event");
        }

        if (!workers) {
            throw new RError(400, "choose the workers");
        }


        await adminAuth(token);
        workers = workers.split(/[,]/);

        for (let worker of workers) {

            worker = worker.split(/[:]/);
            const worker_id = worker[0];
            const cost = worker[1];

            const temp = await workers_events.findOne({
                where: {
                    event_id: event_id,
                    worker_id: worker
                }
            })

            if (temp) {
                return res.status(400).send(responseMessage(false, "this worker is already added to this event"));
            }


            await workers_events.create({
                event_id,
                worker_id,
                cost
            });
            eventEmitter.emit('send_event_id', worker_id, event_id);
        }

        res.status(200).send(responseMessage(true, "workers have been added to the event successfully"));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }


}

const getActions = async (req, res) => {
    const admin_id = req.body.admin_id;

    try {

        const acts = await Actions.findAll({ where: { admin_id } });
        let actions = [];

        for (let index = 0; index < acts.length; index++) {
            const element = acts[index];
            let { action, details, time } = element;

            const dateObject = new Date(time);
            const date = dateObject.toLocaleString("en", { hour12: false });
            time = date;
            const act = { action, time, details };
            actions.push(act);

        }

        res.status(200).send(responseMessage(true, "actions retrieved successfully", actions));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }

}

module.exports = {
    createAdmin,
    login,
    deleteAdmin,
    showAllAdmins,
    makeReservationByAdmin,
    deleteReservationByAdmin,
    showReservationsForAdmin,
    stats,
    addWorkersToEvent,
    getActions

};

