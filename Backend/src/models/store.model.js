const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user.model');

const Store = sequelize.define('Store', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  store_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 100],
      is: /^[a-z0-9-]+$/i
    }
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Full ingress URL for the store'
  },
  status: {
    type: DataTypes.ENUM('provisioning', 'deploying', 'ready', 'failed', 'suspended'),
    defaultValue: 'provisioning',
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  helm_release_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Helm release name in Kubernetes'
  },
  namespace: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Kubernetes namespace'
  },
  db_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Database name for this store'
  },
  db_user: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Database user for this store'
  },
  db_password: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Database password (encrypted in production)'
  },
  admin_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'WooCommerce admin email'
  },
  admin_password: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'WooCommerce admin password'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error details if deployment failed'
  },
  resource_quota: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      cpu: '500m',
      memory: '1Gi',
      storage: '10Gi'
    },
    comment: 'Resource allocation for this store'
  }
}, {
  tableName: 'stores',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['store_name']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['helm_release_name']
    }
  ]
});

// Define relationships
Store.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(Store, {
  foreignKey: 'user_id',
  as: 'stores'
});

module.exports = Store;