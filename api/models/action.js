module.exports = (sequelize, DataTypes) => {
    return sequelize.define("action", {
            admin_id: {
                type: DataTypes.INTEGER,
                require: false,
                allowNull: true
            },
            worker_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                require: false
            },
            event_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                require: false
            },
            action: {
                type: DataTypes.STRING,
                allowNull: false,
                require: true
            },
            time: {
                type: DataTypes.DATE,
                allowNull: false,
                require: true,
            },
            details: {
                type: DataTypes.JSON,
                allowNull: false,
                require: true
            },


        },
        {timestamps: true},)
}