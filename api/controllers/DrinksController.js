const db = require("../models/index");
const responseMessage = require("../middleware/responseHandler");
const RError = require("../middleware/error.js");
const fs = require('fs');
const jwt = require("jsonwebtoken");


const Drink = db.drinks;
const Actions = db.actions;
const ValidationError = db.ValidationError;

const addDrink = async (req, res) => {

    const {title, description, price, quantity, cost} = req.body;

    if (!req.file) {
        return res.status(400).send(responseMessage(false, " img is required"))

    }
    const picture = req.file.path;
    try {

        const drink = await Drink.create({
            title,
            description,
            price,
            quantity,
            cost,
            picture
        });

        let token = req.headers["x-access-token"];
        if (!token) {
            return res.status(403).json({
                msg: "No token provided!"
            })
        }

        let admin_id = null
        let worker_id = null

        await jwt.verify(token, process.env.SECRET, null, (err, decoded) => {
            console.log(decoded)
            if (decoded.worker_id)
                worker_id = decoded.worker_id
            if (decoded.admin)
                admin_id = decoded.admin.admin_id
            if (err) {
                return res.send(err)
            }
        });

        await Actions.create({
            admin_id: admin_id,
            worker_id: worker_id,
            action: "Adding drink",
            time: Date.now(),
            details: drink
        })

        res.status(201).send(responseMessage(true, "drink has been added", drink));


    } catch
        (errors) {
        fs.unlinkSync(picture);

        var statusCode = errors.statusCode || 500;
        if (errors instanceof ValidationError) {

            statusCode = 400;

        }

        return res.status(statusCode).send(responseMessage(false, errors.message));

    }

}

const showDrinks = async (req, res) => {


    try {

        const drinks = await Drink.findAll();


        res.status(200).send(responseMessage(true, "drinks have been retrieved", drinks));


    } catch (error) {
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).send(responseMessage(false, error.message));


    }

}

const viewDrink = async (req, res) => {

    const drink_id = req.body.drink_id;
    if (!drink_id) {
        return res.status(400).send(responseMessage(false, "choose drink to show"));

    }


    try {
        const drink = await Drink.findByPk(drink_id);

        if (drink === null) {
            throw new RError(404, "drink not found");
        }

        res.status(200).send(responseMessage(true, "drink has been retrieved", drink));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));

    }

}

const updateDrink = async (req, res) => {

    const {title, description, price, quantity, cost} = req.body;
    const drink_id = req.body.drink_id;

    try {

        const drink = await Drink.findByPk(drink_id);
        const old_drink = drink;

        if (drink == null) {
            throw new RError(404, "drink not found")
        }

        if (title) {
            drink.title = title;
        }
        if (description) {
            drink.description = description;
        }
        if (price) {
            drink.price = price;
        }
        if (quantity) {
            drink.quantity = quantity;
        }
        if (cost) {
            drink.cost = cost;
        }
        if (req.file) {
            if (fs.existsSync(drink.picture)) {
                fs.unlinkSync(drink.picture);
            }

            drink.picture = req.file.path;

        }

        let token = req.headers["x-access-token"];
        if (!token) {
            return res.status(403).json({
                msg: "No token provided!"
            })
        }

        let admin_id = null
        let worker_id = null
        await jwt.verify(token, process.env.SECRET, null, (err, decoded) => {
            if (decoded.worker_id)
                worker_id = decoded.worker_id
            if (decoded.admin)
                admin_id = decoded.admin.admin_id
            if (err) {
                return res.send(err)
            }
        });

        await Actions.create({
            admin_id: admin_id,
            worker_id: worker_id,
            action: "Updating drink",
            time: Date.now(),
            details: {"old_drink": old_drink, "new_drink": drink}
        })

        await drink.save();
        res.status(200).send(responseMessage(true, "drink has been updated", drink));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }

}


const deleteDrink = async (req, res) => {

    const drink_id = req.body.drink_id;

    try {

        const drink = await Drink.findByPk(drink_id);

        if (drink == null) {
            throw new RError(404, "drink not found")
        }

        let token = req.headers["x-access-token"];
        if (!token) {
            return res.status(403).json({
                msg: "No token provided!"
            })
        }

        let admin_id = null
        let worker_id = null
        await jwt.verify(token, process.env.SECRET, null, (err, decoded) => {
            if (decoded.worker_id)
                worker_id = decoded.worker_id
            if (decoded.admin)
                admin_id = decoded.admin.admin_id
            if (err) {
                return res.send(err)
            }
        });

        await Actions.create({
            admin_id: admin_id,
            worker_id: worker_id,
            action: "Deleting drink",
            time: Date.now(),
            details: drink
        })

        await drink.destroy();

        res.status(200).send(responseMessage(true, "drink has been deleted"));

    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).send(responseMessage(false, error.message));
    }

}

module.exports = {addDrink, showDrinks, viewDrink, updateDrink, deleteDrink};

