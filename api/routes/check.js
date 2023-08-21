//importing modules
const express = require('express')
const check = require('../controllers/CheckController')

const router = express.Router()

router.post('/check',check)



module.exports = router;
