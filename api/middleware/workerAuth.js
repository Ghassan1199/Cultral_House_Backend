const jwt = require("jsonwebtoken");

const db = require("../models/index");

const RError = require("./error.js");


const Worker = db.workers;


const workerAuth = async (token)=>{

    if (!token) {
        throw new RError(401,"unauthorized");
    }
    
    const decodedToken = jwt.verify(token, process.env.SECRET);

        const worker_id = decodedToken.worker_id;

        const worker = await Worker.findByPk(worker_id);

        if (worker == null) {
            throw new RError(404, "worker not found")
            
        }

        return worker;

}

module.exports = workerAuth;