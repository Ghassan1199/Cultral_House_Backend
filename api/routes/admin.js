//importing modules
const express = require('express')
const adminController = require('../controllers/AdminController')
const checkAuth = require('../middleware/checkAuth')
const upload = require('../middleware/upload')

const router = express.Router()

router.post('/signup',checkAuth.checkIfSuper ,checkAuth.saveAdmin, adminController.createAdmin)

router.post('/login', adminController.login)

router.delete('/delete', checkAuth.checkIfSuper, adminController.deleteAdmin)

router.get('/show-all', checkAuth.checkIfSuper, adminController.showAllAdmins)

router.post('/make-reservation', adminController.makeReservationByAdmin)

router.delete('/delete-reservation', adminController.deleteReservationByAdmin)

router.get('/show-reservations', adminController.showReservationsForAdmin)

router.get('/stats', adminController.stats)
router.post('/addWorkersToEvent', adminController.addWorkersToEvent)

router.post('/getActions', checkAuth.checkIfSuper, adminController.getActions)


module.exports = router;