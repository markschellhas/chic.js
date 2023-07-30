/**
 * Template for a model content component
 */
export let modelContentTemplate = `
// {MODEL_NAME} model:
const {MODEL_NAME}Model = function(sequelize, DataTypes) {
    return sequelize.define('{MODEL_NAME}', {
{FIELDS}
    },
    {
      sequelize,
      tableName: '{TABLE_NAME}',
      timestamps: false,
    })
  }
  
  export { {MODEL_NAME}Model }
`;