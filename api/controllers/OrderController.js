const db = require("../Models/index");

const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const customerAuth = require("../middleware/customerAuth");


const Reservation = db.reservations;
const Order = db.orders;
const Orders_drinks = db.orders_drinks;
const Op = db.Op;
const sequelize = db.sequelize;
const Drink = db.drinks;
const ValidationError = db.ValidationError;



const makeOrder = async (req, res)=>{

    //send the order's cost in the response ??

    const token = req.headers["x-access-token"];

    const reservation_id = req.body.reservation_id;
    const drinks = req.body.drinks;

    if(!reservation_id){
        return res.status(400).send(responseMessage(false,"insert reservaation_id"));

    }
    if(!drinks){
        return res.status(400).send(responseMessage(false,"insert drinks"));


    }

     let transaction;

    try {

        transaction = await sequelize.transaction();


          await customerAuth(token);





        const order = await Order.create({

            order_date: Date(),
            reservation_id,

        },{transaction});



        const ODS = [];

        for(const drink of drinks)
        {
            const { drink_id, quantity } = drink;


            const od = await Orders_drinks.create({
                order_id : order.order_id,

                drink_id,
    
                quantity

            }, {transaction});


            ODS.push(od);

        }
        
       await transaction.commit();

        ord = {order, ODS};
        res.status(201).send(responseMessage(true, "order is added", ord));


    
    } catch (errors) {


        await transaction.rollback();
       
        var statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {

            statusCode = 400;
            
        }

        return res.status(statusCode).send(responseMessage(false, errors.message));


        
    }



}

const showOrderDetails = async (req, res)=>{


    const token = req.headers["x-access-token"];
  

    const order_id = req.body.order_id;


    if (!order_id) {
        
        return res.status(400).send(responseMessage(false,"choose order to show"));


    }


    try {

       const customer = await customerAuth(token);

       const customer_id = customer.customer_id;


        const order = await Order.findByPk(order_id);

        if (order === null) {
            throw new RError(404, "no order found");

        }

        const reservation = await Reservation.findByPk(order.reservation_id);
       

        const check = reservation.customer_id === customer_id;



        if (!check) {
            throw new RError(401, "not allowed");

        }

        const ODS = await Orders_drinks.findAll({where: {order_id}});


        ord = {order, ODS};
        res.status(200).send(responseMessage(true, "order is retrieved", ord));        
    } catch (error) {


        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

        
    }

   
}


const updateOrder = async (req, res)=>{

    const token = req.headers["x-access-token"];
  
    const drinks  = req.body.drinks;
    const order_id = req.body.order_id;


    if(!order_id){


        return res.status(400).send(responseMessage(false,"choose order"));


    }

    if (!drinks) {
        
        return res.status(400).send(responseMessage(false,"update something"));


    }

    let transaction;

    try {

         await customerAuth(token);



        const oldODS = await Orders_drinks.findAll({where: {order_id}});

        transaction = await sequelize.transaction();


        for(od of oldODS){

            await od.destroy({transaction});
        }



        const ODS = [];

        for(const drink of drinks)
        {
            const { drink_id, quantity } = drink;


            const od = await Orders_drinks.create({
                order_id : order_id,

                drink_id,
    
                quantity

            }, {transaction});


            ODS.push(od);

        }
        
        await transaction.commit();
        res.status(200).send(responseMessage(true, "order is updated", ODS));        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

        
    }


}


const deleteOrder = async (req, res)=>{



    const token = req.headers["x-access-token"];
  
    const order_id = req.body.order_id;


    if (!order_id) {
        
        return res.status(400).send(responseMessage(false,"choose order"));

    }


    try {

    
        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;
 
 

        const order = await Order.findByPk(order_id);

        if (order === null) {
            throw new RError(404, "no order found");

        }

        const reservation = await Reservation.findByPk(order.reservation_id);


        const check = reservation.customer_id === customer_id;

        if (!check) {
            throw new RError(401, "not allowed");

        }

        await order.destroy();


        res.status(200).send(responseMessage(true, "order is deleted"));        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }



}


const showOrders = async (req, res)=>{

    const token = req.headers["x-access-token"];
  

    try {

       

    
        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;


        const reservations = await Reservation.findAll({where:{customer_id}});

       const reservation_id = reservations.map(v=> v.reservation_id);

        const orders = await Order.findAll({
            where :{
                [Op.or]: {reservation_id}
            }
        });


        if (orders.length == 0) {
                
            throw new RError(404, "no orders found");


        }

        
        res.status(200).send(responseMessage(true, "orders are retrieved", orders));        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }

}


const browseBills = async (req, res)=>{

    const token = req.headers["x-access-token"];

    try {

        const customer = await customerAuth(token);

        const customer_id = customer.customer_id;

        const reservations = await Reservation.findAll({where:{customer_id}});

       let result = [];
       let temp;

       for(const resrvation of reservations){
        temp = [];
        const {reservation_id} = resrvation;
        const orders = await Order.findAll({
            where :{
            reservation_id
            }
        });

        if (orders.length == 0) {
                
            throw new RError(404, "no orders found");


        }

        const order_id = orders.map(v=> v.order_id);
        const ODS = await Orders_drinks.findAll({
            where :{
                [Op.or]: {order_id}
            }
        });

        const drink_id = ODS.map(v=> v.drink_id);

        const drinks = await Drink.findAll({
            where :{
                [Op.or]: {drink_id}
            }
        });

           
        let t = 0;

       for(const drink of drinks){
        const {title, price, drink_id} = drink;

        for (let index = 0; index < ODS.length; index++) {

            if (ODS[index].drink_id === drink_id) {

                const {quantity} = ODS[index];

                const v = price * quantity;
                const obj = {
                    drink: title,
                    price: price,
                    quantity: quantity,
                    total: v
                }

                t+=v;
                temp.push(obj);

            }
            
        }



       }
       temp.push({totalAmount: t})
       result.push(temp);


       }





       res.status(200).send(responseMessage(true, "bills are retrieved", result));        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }

}

// for admin/worker
const showAllOrders = async (req, res)=>{
  

    try {

       

    
// need admin/worker  auth???
        const reservations = await Reservation.findAll();

       const reservation_id = reservations.map(v=> v.reservation_id);

        const orders = await Order.findAll({
            where :{
                [Op.or]: {reservation_id}
            }
        });


        if (orders.length == 0) {
                
            throw new RError(404, "no orders found");


        }

        
        res.status(200).send(responseMessage(true, "orders are retrieved", orders));        
    } catch (error) {

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
        
    }

}

module.exports = { makeOrder, showOrderDetails, updateOrder, 
     deleteOrder, showOrders, browseBills, showAllOrders};

