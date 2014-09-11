var mongoose = require("mongoose");

var UsersSchema = new mongoose.Schema({
  username: String,
  password: String,
  access: Number,
  portfolio: [
  						{ 
  							code: String, 
  			  	  	amount: Number,
  			  			averagePrice: Number,
  			  			timeOfPurchase: Number,
  			  			expiryDate: Number
							}
  					 ],
  cashbook: {
    accountTotal: Number,
    realizedProfit: Number,
    unrealizedProfit: Number  
  }
});

UsersSchema.methods.findNonAdminUsers = function (cb) {
  return this.model('Users').find({ access: 0 }, cb);
}

var Users = mongoose.model('Users', UsersSchema, 'users');

module.exports = {Users: Users}
