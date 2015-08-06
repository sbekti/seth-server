'use strict';

module.exports = function(sequelize, DataTypes) {
  var Location = sequelize.define('Location', {
    latitude: DataTypes.FLOAT(4, 6),
    longitude: DataTypes.FLOAT(4, 6),
    timestamp: DataTypes.DATE,
    speed: DataTypes.FLOAT(4, 2),
    course: DataTypes.FLOAT(4, 2),
    altitude: DataTypes.FLOAT(4, 2),
    satellites: DataTypes.INTEGER,
    hdop: DataTypes.FLOAT(4, 2),
    age: DataTypes.INTEGER,
    charge: DataTypes.INTEGER,
    voltage: DataTypes.FLOAT(2, 3),
    signal: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        Location.belongsTo(models.Device, {
          onDelete: 'CASCADE',
          foreignKey: {
            allowNull: false
          }
        });
      }
    }
  });

  return Location;
};
