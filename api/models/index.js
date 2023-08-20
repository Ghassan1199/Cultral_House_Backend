//importing modules
const dotenv = require('dotenv');
dotenv.config();
const {Sequelize, DataTypes, Op, ValidationError} = require('sequelize')


const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, {dialect: "postgres", logging : false})

// //checking if connection is done
// sequelize.authenticate().then(() => {
//     console.log(`Database connected to discover`)
// }).catch((err) => {
//     console.log(err)
// })

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.Op = Op;
db.ValidationError = ValidationError;
db.admins = require('./admin.js')(sequelize, DataTypes);
db.customers = require('./customer.js')(sequelize, DataTypes);
db.workers = require('./worker.js')(sequelize, DataTypes);
db.events = require('./event.js')(sequelize, DataTypes);
db.photos = require('./photo.js')(sequelize, DataTypes);
db.reservations = require('./reservation.js')(sequelize, DataTypes);
db.reports = require('./report.js')(sequelize, DataTypes);
db.customers_reports = require('./customer_report.js')(sequelize, DataTypes);
db.artists = require('./artist.js')(sequelize, DataTypes);
db.artists_events = require('./artist_event.js')(sequelize, DataTypes);
db.workers_events = require('./worker_event.js')(sequelize, DataTypes);
db.orders = require('./order.js')(sequelize, DataTypes);
db.drinks = require('./drink.js')(sequelize, DataTypes);
db.orders_drinks = require('./order_drink.js')(sequelize, DataTypes);
db.actions = require('./action')(sequelize,DataTypes);



// admin-event relation

db.admins.hasMany(db.events,{foreignKey:'admin_id'});
db.events.belongsTo(db.admins,{foreignKey:'admin_id'});
db.admins.hasMany(db.actions,{foreignKey:'admin_id'});
db.actions.belongsTo(db.admins,{foreignKey:'admin_id'})

// event-photo relation
db.events.hasMany(db.photos,{foreignKey:'event_id'});
db.photos.belongsTo(db.events,{foreignKey:'event_id'});

// event-reservation relation
db.events.hasMany(db.reservations,{foreignKey: 'event_id'});
db.reservations.belongsTo(db.events,{foreignKey: 'event_id'});

// customer-reservation relation
db.customers.hasMany(db.reservations, {foreignKey: 'customer_id'});
db.reservations.belongsTo(db.customers, {foreignKey :'customer_id'});

// worker-reservation relation
db.workers.hasMany(db.reservations, {foreignKey: 'worker_id'});
db.reservations.belongsTo(db.workers, {foreignKey: 'worker_id'});

//customer-report relation
db.customers.hasMany(db.customers_reports, {foreignKey: 'customer_id'});
db.reports.hasMany(db.customers_reports, {foreignKey: 'report_id', onDelete: 'cascade'});
db.customers_reports.belongsTo(db.customers, {foreignKey: 'customer_id'});
db.customers_reports.belongsTo(db.reports, {foreignKey: 'report_id'});

//artist-event relation
db.artists.hasMany(db.artists_events, {foreignKey: 'artist_id'});
db.events.hasMany(db.artists_events, {foreignKey: 'event_id'});
db.artists_events.belongsTo(db.artists, {foreignKey: 'artist_id'});
db.artists_events.belongsTo(db.events, {foreignKey: 'event_id'});

//worker-event relation
db.workers.hasMany(db.workers_events, {foreignKey: 'worker_id'});
db.events.hasMany(db.workers_events, {foreignKey: 'event_id'});
db.workers_events.belongsTo(db.workers, {foreignKey: 'worker_id'});
db.workers_events.belongsTo(db.events, {foreignKey: 'event_id'});

//order-worker_event relation
db.workers_events.hasMany(db.orders, {foreignKey: 'worker_event_id'});
db.orders.belongsTo(db.workers_events, {foreignKey: 'worker_event_id'});

//order-reservation relation
db.reservations.hasMany(db.orders, {foreignKey: 'reservation_id'});
db.orders.belongsTo(db.reservations, {foreignKey: 'reservation_id'});

// order-drink relation
db.orders.hasMany(db.orders_drinks, {foreignKey: 'order_id', onDelete: 'cascade'});
db.orders_drinks.belongsTo(db.orders, {foreignKey: 'order_id'});
db.drinks.hasMany(db.orders_drinks, {foreignKey: 'drink_id'});
db.orders_drinks.belongsTo(db.drinks, {foreignKey: 'drink_id'});



//exporting the module
module.exports = db