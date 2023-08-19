const bcrypt = require("bcrypt");
const db = require("../models/index");
const Actions = db.actions;
const adminAuth = require("../middleware/adminAuth")
const jwt = require("jsonwebtoken");

const Artist = db.artists;

const createArtist = async (req, res) => {
    try {
        const {artist_name, description} = req.body
        const data = {artist_name, description}
        const artist = await Artist.create(data)

        const token = req.headers["x-access-token"];
        const admin = await adminAuth(token);
        const admin_id = admin.admin_id;

        await Actions.create({
            admin_id: admin_id,
            action: "Adding New Artist",
            time: Date.now(),
            details: artist
        })

        res.status(200).json(artist)

    } catch (e) {
        res.status(400).json({
            req: req.body,
            msg: e.name
        })
        console.log(e);
    }
}

const deleteArtist = async (req, res) => {
    try {
        const artist = await Artist.findByPk(req.body.artist_id)
        if (!artist) {
            throw new Error("No Artist Found")
        }

        const token = req.headers["x-access-token"];
        const admin = await adminAuth(token);
        const admin_id = admin.admin_id;

        await Actions.create({
            admin_id: admin_id,
            action: "Deleting Artist",
            time: Date.now(),
            details: artist
        })

        artist.destroy();
        res.status(202).json({
            msg: "Artist has been deleted successfully",
            data: artist
        });

    } catch (e) {
        console.log(e)
        res.status(404).json({
            msg: "Error",
            data: e.message
        })
    }
}

const showAll = async (req, res) => {
    const artists = await Artist.findAll()
    if (!artists) {
        return res.status(200).json({
                msg: "No Artists Has Been Added",
                data: null
            }
        )
    } else {
        return res.status(200).json({
            msg: artists.length + " Artists has been found",
            data: artists
        })
    }
}

const showArtist = async (req, res) => {
    if (!req.body.artist_id) {
        return res.status(400).json({
            msg: "You did`nt provide artist_id",
            data: null
        })
    }

    const artist = await Artist.findByPk(req.body.artist_id)
    if (!artist) {
        return res.status(404).json({
            msg: "Artist Not Found",
            data: null
        })
    } else {
        return res.status(200).json({
            msg: "Artist Has Been found",
            data: artist
        })
    }
}


module.exports = {
    createArtist,
    deleteArtist,
    showAll,
    showArtist
}
