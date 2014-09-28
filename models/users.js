var mongoose = require("mongoose");

var UsersSchema = new mongoose.Schema({
  username: String,
  password: String,
  access: Number,
  portfolio: [
  						{ 
  							code: String, 
  			  	  	amount: Number,
  			  			averagePrice: Number
							}
  					 ],
  cashbook: {
    accountTotal: Number  
  }
});

UsersSchema.methods.findNonAdminUsers = function (cb) {
  return this.model('Users').find({ access: 0 }, cb);
}

var Users = mongoose.model('Users', UsersSchema, 'users');

module.exports = {Users: Users}
