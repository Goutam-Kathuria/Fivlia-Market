const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name:String,
  image: String,
  description:String,
  attribute:[{type:String}],
  status:{type:Boolean,default:true},
  commison:Number
});

const categorySchema = new mongoose.Schema({
  name:String,
  image: String,
  description:String,
  subcat: [subCategorySchema],
  attribute:[{type:String}],
  filter: [{_id: { type: mongoose.Schema.Types.ObjectId },Filter_name: { type: String },
 selected: [{_id: { type: mongoose.Schema.Types.ObjectId },name: { type: String }}],
 }],
  status:{type:Boolean,default:true}
});
module.exports=mongoose.model('Category', categorySchema);


