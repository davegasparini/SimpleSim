var mongoose = require("mongoose");

var eventScriptSchema = new mongoose.Schema({
  toc: Number,
  eventType: [String],
  news: [{
  			headline: String,
  			article: String
  		 }],
  marketUpdate: [{
  					productCode: String,
  					marketPrice: Number
  				 }]

});

eventScriptSchema.statics.findCurrentScript = function (time, cb) {
  	this.find({toc: time}, cb);
};

var EventScript = mongoose.model('EventScript', eventScriptSchema, 'eventScript');

module.exports = {EventScript: EventScript}