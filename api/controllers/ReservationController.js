const db = require("../models/index");
const jwt = require("jsonwebtoken");


const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const customerAuth = require("../middleware/customerAuth");
const eventEmitter = require("./eventEmitter");


const Reservation = db.reservations;
const Event = db.events;
const ValidationError = db.ValidationError;
const sequelize = db.sequelize;
const Op = db.Op;





const makeReservation = async (req, res) => {

    const token = req.headers["x-access-token"];


    try {

        const event_id = req.body.event_id;

        if (!event_id) {
            throw new RError(400, "choose the event");
        }


        const number_of_places = req.body.number_of_places;

        if (!number_of_places) {

            throw new RError(400, "enter the number of the attendees");

        }

        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;
        const customer_name = customer.first_name;

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
            customer_id,
            customer_name

        });

        await event.save();


        eventEmitter.emit('create_new_reservation');

        res.status(201).send(responseMessage(true, "reservation has been added", reservation));


    } catch (errors) {

        var statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {

            statusCode = 400;

        }

        return res.status(statusCode).send(responseMessage(false, errors.message));

    }



}


const setSection = async (req, res) => {

    const token = req.headers["x-access-token"];

    try {

        const reservation_id = req.body.reservation_id;
        const section_number = req.body.section_number;


        if (!reservation_id) {
            throw new RError(400, "choose the reservation");
        }


        const reservation = await Reservation.findByPk(reservation_id);

        if (reservation === null) {

            throw new RError(404, "reservation not found");

        }


        if (!section_number) {

            throw new RError(400, "enter the number of the section");

        }
        if (section_number < 1) {
            throw new RError(400, "enter a valid number");

        }

        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;



        if (!(customer_id === reservation.customer_id)) {
            throw new RError(401, " you are not allowed");

        }


        const reservations = await Reservation.count({
            where: { section_number },
        });

        if (reservations === 10) {
            throw new RError(400, " there is no space in this section");


        }



        reservation.section_number = section_number;

        await reservation.save();

        res.status(201).send(responseMessage(true, "set is placed", section_number));
    } catch (error) {


        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }


}


const deleteReservation = async (req, res) => {

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


        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;


        if (!(customer_id === reservation.customer_id)) {
            throw new RError(401, " you are not allowed");

        }
        else {


            const event_id = reservation.event_id;

            const number_of_places = reservation.number_of_places;
            const event = await Event.findByPk(event_id);

            event.available_places += number_of_places;

            await reservation.destroy({ transaction });
            await event.save({ transaction });

            await transaction.commit();

            res.status(200).send(responseMessage(true, "reservation has been deleted successfully"));

        }


    } catch (error) {


        await transaction.rollback();

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }



}


const updateReservation = async (req, res) => {
    const token = req.headers["x-access-token"];


    let transaction;
    try {

        const reservation_id = req.body.reservation_id;
        const number_of_places = req.body.number_of_places;


        transaction = await sequelize.transaction();


        if (!reservation_id) {
            throw new RError(400, "choose the reservation");
        }


        const reservation = await Reservation.findByPk(reservation_id);

        if (reservation === null) {

            throw new RError(404, "reservation not found");

        }


        if (!number_of_places) {

            throw new RError(400, "enter the number of the places");

        }



        const customer = await customerAuth(token);


        const customer_id = customer.customer_id;





        if (!(customer_id === reservation.customer_id)) {
            throw new RError(401, " you are not allowed");

        }





        const old = reservation.number_of_places;

        const newNum = old - number_of_places;



        const event_id = reservation.event_id;

        const event = await Event.findByPk(event_id);

        if (number_of_places < 1) {
            throw new RError(400, "enter a valid number");

        }




        event.available_places += newNum;

        if (event.available_places < 0) {
            throw new RError(400, "no enough spots in the events");

        }

        reservation.number_of_places = number_of_places;


        await reservation.save({ transaction });

        await event.save({ transaction });


        await transaction.commit();

        res.status(200).send(responseMessage(true, "reservation has been updated successfully", reservation));

    } catch (error) {

        await transaction.rollback();
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }



}

const showReservations = async (req, res) => {


    const token = req.headers["x-access-token"];

    try {
        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;


        const reservations = await Reservation.findAll({ where: { customer_id } });

        if (reservations.length === 0) {
            throw new RError(404, "no reservations found");


        }

        res.status(200).send(responseMessage(true, "reservations have been updated successfully", reservations));

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }
}


const viewReservation = async (req, res) => {


    const token = req.headers["x-access-token"];

    const reservation_id = req.body.reservation_id;

    if (!reservation_id) {

        return res.status(400).send(responseMessage(false, "choose reservation to show"));


    }

    try {

        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;


        const reservation = await Reservation.findOne({ where: { reservation_id } });

        if (reservation == null) {

            throw new RError(404, "reservation not found");


        }

        if (reservation.customer_id !== customer_id) {

            throw new RError(401, "Not allowed");

        }

        res.status(200).send(responseMessage(true, "reservation has been retrieved", reservation));

    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }

}


const showEvents = async (req, res) => {



    const token = req.headers["x-access-token"];


    try {



        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;

        const reservations = await Reservation.findAll({ where: { customer_id } });

        if (reservations.length == 0) {

            throw new RError(404, "no events found");


        }

        const event_id = reservations.map(v => v.event_id);

        const events = await Event.findAll({
            where: {
                [Op.or]: { event_id },
            },
        });


        res.status(200).send(responseMessage(true, "events have been retrieved", events));

    } catch (error) {

        console.log(error)

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));


    }




}






module.exports = {
    makeReservation, setSection, deleteReservation, updateReservation, viewReservation,
    showReservations, showEvents
};
