'use strict';

module.exports = function(sequelize, DataTypes) {
  var Device = sequelize.define('Device', {
    name: DataTypes.STRING,
    username: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        Device.hasMany(models.Location)
      }
    }
  });

  return Device;
};
