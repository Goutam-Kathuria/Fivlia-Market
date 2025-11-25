const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name:String,
    password:{type:String},
    mobileNumber:{type:String},
    email:{type:String},
    adharCardNumber:Number,
    latitude:Number,
    longitude:Number
},{timestamps:true})
module.exports=mongoose.model('User',userSchema)
