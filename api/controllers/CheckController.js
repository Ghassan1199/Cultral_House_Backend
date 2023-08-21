
const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const db = require("../models/index");

const Customer = db.customers;
const Event = db.events;
const Reservation = db.reservations;

const check = async (req, res)=>{


    try {


        const reservation_id = req.body.reservation_id;

        if (!reservation_id) {
            throw new RError(400, "choose the reservation");
        }

      
        const reservation = await Reservation.findByPk(reservation_id);

        if (reservation === null) {

            throw new RError(404, "reservation not found");
    
        }


        const customer_id = reservation.customer_id;
    
       

            const event_id = reservation.event_id;


            const event = await Event.findByPk(event_id);


            const customer = await Customer.findByPk(customer_id);


            const eventDate = new Date(event.begin_date);
            const currentDate = new Date();
    
    
    
            
            const timeDifferenceInMilliseconds = eventDate - currentDate;
            const timeDifferenceInHours = timeDifferenceInMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours
            const timeDifferenceInMinutes = timeDifferenceInMilliseconds / (1000 * 60); // Convert milliseconds to hours
    
    
            if (Math.abs(timeDifferenceInMinutes) >= 15) {
    
               return  res.status(303).send(responseMessage(false, "event is over"));
    
            }
            else{

                res.status(200).send(responseMessage(true," active event"));        


            }
    


            
        

    } catch (error) {

    
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    
        
    }



}


module.exports = check;