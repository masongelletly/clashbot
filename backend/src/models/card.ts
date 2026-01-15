module.exports = (sequelize: any, DataTypes: any) => {
    const Card = sequelize.define("Card", {
      cardId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
      variant: { 
        type: DataTypes.ENUM("base", "evo", "hero"), 
        primaryKey: true, 
        allowNull: false,
        defaultValue: "base"
      },
      cardname: { type: DataTypes.STRING, allowNull: false },
      elo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1500 },
      matchups: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    });
  
    Card.associate = (models: any) => {
      Card.belongsTo(models.card, {onDelete: "CASCADE" });
    };
  
    return Card;
  };