const jwt = require("jsonwebtoken");

const db = require("../models/index");

const RError = require("./error.js");


const Customer = db.customers;


const customerAuth = async (token)=>{

    if (!token) {
        throw new RError(401,"unauthorized");
    }

    

    const decodedToken = jwt.verify(token, process.env.SECRET);


        const customer_id = decodedToken.customer_id;



        const customer = await Customer.findByPk(customer_id);


        if (customer == null) {

            throw new RError(404, "customer not found")
            
        }


        return customer;

}

module.exports = customerAuth;